-- MarkBreak filter: flow breaks + YAML/file role → Div.
-- Breaks: \newpage / \pagebreak / //--- / //break → format-specific page break.
-- Roles: meta.role wraps the document body in a Div with attribute role=...

local role_from_meta = nil

local function newpage(format)
  if format == 'docx' then
    local pagebreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
    return pandoc.RawBlock('openxml', pagebreak)
  elseif format:match 'html' then
    return pandoc.RawBlock('html', '<div style="page-break-after: always;"></div>')
  elseif format:match 'tex$' then
    return pandoc.RawBlock('tex', '\\newpage{}')
  elseif format:match 'epub' then
    return pandoc.RawBlock('html', '<p style="page-break-after: always;"></p>')
  else
    return pandoc.Para{pandoc.Str '\f'}
  end
end

local function is_default_break_command(command)
  if not command then return false end
  -- Pandoc smart typography may turn //--- into //— (em dash).
  local s = command:gsub('^%s+', ''):gsub('%s+$', '')
  return s:match '^\\newpage%{?%}?$'
    or s:match '^\\pagebreak%{?%}?$'
    or s == '//---'
    or s == '//—'
    or s == '//--'
    or s == '//break'
end

local function para_text(el)
  if not el.content or #el.content == 0 then return nil end
  local parts = {}
  for _, inline in ipairs(el.content) do
    if inline.text then
      table.insert(parts, inline.text)
    elseif inline.tag == 'Space' then
      table.insert(parts, ' ')
    else
      return nil
    end
  end
  return table.concat(parts)
end

function Meta(meta)
  if meta.role then
    role_from_meta = pandoc.utils.stringify(meta.role)
  end
  return meta
end

function RawBlock(el)
  if FORMAT:match 'tex$' then
    return nil
  end
  if el.format:match 'tex' and is_default_break_command(el.text) then
    return newpage(FORMAT)
  end
  return nil
end

function Para(el)
  local text = para_text(el)
  if text == '\f' or is_default_break_command(text) then
    return newpage(FORMAT)
  end
  -- Mid-file role escape: //% epilog — drop the marker; role applied in Pandoc walker below if alone.
  -- File-level YAML role is the 0.2 gate; //% is preserved as a Div marker when followed by content
  -- via a simple rewrite: replace the para with an empty span Div open signal using a Div with
  -- class markbreak-role-mark (consumed only when building sections — for 0.2 we keep as Raw/Div stub).
  if text and text:match '^//%%%s+([%w%-]+)%s*$' then
    local role = text:match '^//%%%s+([%w%-]+)%s*$'
    return pandoc.Div({}, pandoc.Attr('', { 'markbreak-role' }, { role = role }))
  end
  return nil
end

function Pandoc(doc)
  if role_from_meta and role_from_meta ~= '' then
    local div = pandoc.Div(doc.blocks, pandoc.Attr('', { role_from_meta }, { role = role_from_meta }))
    doc.blocks = { div }
  end
  return doc
end
