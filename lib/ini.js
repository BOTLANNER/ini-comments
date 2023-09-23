const { hasOwnProperty } = Object.prototype

const COMMENT_TOKEN_IDENTIFIER = "#;COMMENT_TOKEN_";
const NESTED_PLACEMENT_IDENTIFIER = "#;NESTED_TOKEN_";


const encode = (obj, opt = {}) => {
  if (typeof opt === 'string') {
    opt = { section: opt }
  }
  opt.align = opt.align === true
  opt.newline = opt.newline === true
  opt.sort = opt.sort === true
  opt.whitespace = opt.whitespace === true || opt.align === true
  // The `typeof` check is required because accessing the `process` directly fails on browsers.
  /* istanbul ignore next */
  opt.platform = opt.platform || (typeof process !== 'undefined' && process.platform)
  opt.bracketedArray = opt.bracketedArray !== false
  opt.retainComments = opt.retainComments === true;

  /* istanbul ignore next */
  const eol = opt.platform === 'win32' ? '\r\n' : '\n'
  const separator = opt.whitespace ? ' = ' : '='
  const children = []

  // Sorting with comments would cause incorrect comment placement
  const keys = opt.sort && !opt.retainComments ? Object.keys(obj).sort() : Object.keys(obj)

  let padToChars = 0
  // If aligning on the separator, then padToChars is determined as follows:
  // 1. Get the keys
  // 2. Exclude keys pointing to objects unless the value is null or an array
  // 3. Add `[]` to array keys
  // 4. Ensure non empty set of keys
  // 5. Reduce the set to the longest `safe` key
  // 6. Get the `safe` length
  if (opt.align) {
    padToChars = safe(
      (
        keys
          .filter(k => obj[k] === null || Array.isArray(obj[k]) || typeof obj[k] !== 'object')
          .map(k => Array.isArray(obj[k]) ? `${k}[]` : k)
      )
        .concat([''])
        .reduce((a, b) => safe(a, opt).length >= safe(b, opt).length ? a : b),
      opt).length
  }

  let out = ''
  const arraySuffix = opt.bracketedArray ? '[]' : ''

  let subKeys = keys;
  for (const k of keys) {
    const val = obj[k]
    if (val && typeof val === 'string' && val === NESTED_PLACEMENT_IDENTIFIER) {
      const parts = splitSections(k, '.')
      let nl ;
      let p = obj;
      let parent;
      for (const part of parts) {
        if (p) {
          parent = p;
          nl = part.replace(/\\\./g, '.');
          p = parent[nl];
        }
      }
      if (p && parent && nl) {
        obj[k] = p;
        delete parent[nl]
        subKeys = subKeys.filter(sk => sk !== nl);
      }
    }
  }

  for (const k of subKeys) {
    const val = obj[k]

    if (k && k.startsWith(COMMENT_TOKEN_IDENTIFIER)) {
      if (opt.retainComments) {
        out += val + eol;
      }
      continue;
    }
    if (val && Array.isArray(val)) {
      for (const item of val) {
        const line = safe(`${k}${arraySuffix}`, opt).padEnd(padToChars, ' ') + separator + safe(item, opt) + eol
        out += line;
      }
    } else if (val && typeof val === 'object') {
      children.push(k)
    } else {
      const line = safe(k, opt).padEnd(padToChars, ' ') + separator + safe(val, opt) + eol
      out += line;
    }
  }

  if (opt.section && out.length) {
    out = '[' + safe(opt.section, opt) + ']' + (opt.newline ? eol + eol : eol) + out
  }

  for (const k of children) {
    const nk = splitSections(k, '.').join('\\.')
    const section = (opt.section ? opt.section + '.' : '') + nk
    const child = encode(obj[k], {
      ...opt,
      section,
    })
    if (out.length && child.length) {
      out += eol
    }

    out += child
  }

  return out
}

function splitSections(str, separator) {
  var lastMatchIndex = 0
  var lastSeparatorIndex = 0
  var nextIndex = 0
  var sections = []

  do {
    nextIndex = str.indexOf(separator, lastMatchIndex)

    if (nextIndex !== -1) {
      lastMatchIndex = nextIndex + separator.length

      if (nextIndex > 0 && str[nextIndex - 1] === '\\') {
        continue
      }

      sections.push(str.slice(lastSeparatorIndex, nextIndex))
      lastSeparatorIndex = nextIndex + separator.length
    }
  } while (nextIndex !== -1)

  sections.push(str.slice(lastSeparatorIndex))

  return sections
}

const decode = (str, opt = {}) => {
  opt.bracketedArray = opt.bracketedArray !== false
  let out = Object.create(null)
  let p = out
  let section = null
  //          section          |key      = value
  const re = /^\[([^\]]*)\]\s*$|^([^=]+)(=(.*))?$/i
  const lines = str.split(/[\r\n]+/g)
  const duplicates = {}

  for (const line of lines) {
    if (!line || line.match(/^\s*$/)) {
      continue
    }
    if (line.match(/^\s*[;#]/)) {
      if (opt.retainComments) {
        p[createCommentToken()] = line;
      }
      continue
    }
    const match = line.match(re)
    if (!match) {
      continue
    }
    if (match[1] !== undefined) {
      section = unsafe(match[1], opt)
      if (section === '__proto__') {
        // not allowed
        // keep parsing the section, but don't attach it.
        p = Object.create(null)
        continue
      }
      p = out[section] = out[section] || Object.create(null)
      continue
    }
    const keyRaw = unsafe(match[2], opt)
    let isArray
    if (opt.bracketedArray) {
      isArray = keyRaw.length > 2 && keyRaw.slice(-2) === '[]'
    } else {
      duplicates[keyRaw] = (duplicates?.[keyRaw] || 0) + 1
      isArray = duplicates[keyRaw] > 1
    }
    const key = isArray ? keyRaw.slice(0, -2) : keyRaw
    if (key === '__proto__') {
      continue
    }
    const valueRaw = match[3] ? unsafe(match[4], opt) : true
    const value = valueRaw === 'true' ||
      valueRaw === 'false' ||
      valueRaw === 'null' ? JSON.parse(valueRaw)
      : valueRaw

    // Convert keys with '[]' suffix to an array
    if (isArray) {
      if (!hasOwnProperty.call(p, key)) {
        p[key] = []
      } else if (!Array.isArray(p[key])) {
        p[key] = [p[key]]
      }
    }

    // safeguard against resetting a previously defined
    // array by accidentally forgetting the brackets
    if (Array.isArray(p[key])) {
      p[key].push(value)
    } else {
      p[key] = value
    }
  }

  // {a:{y:1},"a.b":{x:2}} --> {a:{y:1,b:{x:2}}}
  // use a filter to return the keys that have to be deleted.
  const remove = []
  const outKeys = Object.keys(out);
  for (const k of outKeys) {
    if (!hasOwnProperty.call(out, k) ||
      typeof out[k] !== 'object' ||
      Array.isArray(out[k])) {
      continue
    }

    // see if the parent section is also an object.
    // if so, add it to that, and mark this one for deletion
    const parts = splitSections(k, '.')
    p = out
    const l = parts.pop()
    const nl = l.replace(/\\\./g, '.')
    let parent;
    let lastPart;
    for (const part of parts) {
      if (part === '__proto__') {
        continue
      }
      if (!hasOwnProperty.call(p, part) || typeof p[part] !== 'object') {
        p[part] = Object.create(null)
        if (p === out) {
          out = moveObjectElement(part, k, p);
        }
      }
      parent = p;
      p = p[part]
    }
    if (p === out && nl === l) {
      continue
    }

    p[nl] = out[k]
    if (p === out) {
      out = moveObjectElement(nl, k, p);
    }
    remove.push(k)
  }
  for (const del of remove) {
    if (opt.retainComments) {
      out[del] = NESTED_PLACEMENT_IDENTIFIER;
    } else {
      delete out[del]
    }
  }

  return out
}

const isQuoted = val => {
  return (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
}

const safe = (val, opt) => {
  if (
    typeof val !== 'string' ||
    val.match(/[=\r\n]/) ||
    val.match(/^\[/) ||
    (val.length > 1 && isQuoted(val)) ||
    val !== val.trim()
  ) {
    return JSON.stringify(val)
  }
  if (opt.retainComments) {
    return val
  }
  return val.split(';').join('\\;').split('#').join('\\#')
}

const unsafe = (val, opt = {}) => {
  val = (val || '').trim()
  if (isQuoted(val)) {
    // remove the single quotes before calling JSON.parse
    if (val.charAt(0) === "'") {
      val = val.slice(1, -1)
    }
    try {
      val = JSON.parse(val)
    } catch {
      // ignore errors
    }
  } else {
    // walk the val to find the first not-escaped ; character
    let esc = false
    let unesc = ''
    for (let i = 0, l = val.length; i < l; i++) {
      const c = val.charAt(i)
      if (esc) {
        if ('\\;#'.indexOf(c) !== -1 && !opt.retainComments) {
          unesc += c
        } else {
          unesc += '\\' + c
        }

        esc = false
      } else if (';#'.indexOf(c) !== -1 && !opt.retainComments) {
        break
      } else if (c === '\\') {
        esc = true
      } else {
        unesc += c
      }
    }
    if (esc) {
      unesc += '\\'
    }

    return unesc.trim()
  }
  return val
}

// Generate a Version 4 (pseudorandom), Variant 1 (big-endian) UUID
const uuid41 = () => {
  let d = '';
  while (d.length < 32) d += Math.random().toString(16).substring(2);
  const vr = ((parseInt(d.substr(16, 1), 16) & 0x3) | 0x8).toString(16);
  return `${d.substring(0, 8)}-${d.substring(8, 4)}-4${d.substring(13, 3)}-${vr}${d.substring(17, 3)}-${d.substring(20, 12)}`;
};

function moveObjectElement(currentKey, afterKey, obj) {
  var result = {};
  var val = obj[currentKey];
  delete obj[currentKey];
  var next = -1;
  var i = 0;
  if (typeof afterKey == 'undefined' || afterKey == null) afterKey = '';
  Object.keys(obj).forEach(function (k) {
    var v = obj[k]
    console.log(k)
    console.log(v)
    if ((afterKey == '' && i == 0) || next == 1) {
      result[currentKey] = val;
      next = 0;
    }
    if (k == afterKey) { next = 1; }
    result[k] = v;
    ++i;
  });
  if (next == 1) {
    result[currentKey] = val;
  }
  if (next !== -1) return result; else return obj;
}

function createCommentToken() {
  return COMMENT_TOKEN_IDENTIFIER + uuid41();
}

function insertCommentBefore(comment, before, iniOrSection) {
  const token = createCommentToken();
    iniOrSection[token] = comment.trim().startsWith(';') || comment.trim().startsWith('#') ? comment : `# ${comment}`;
    const keyIdx = Object.keys(iniOrSection).indexOf(before) - 1;
    return moveObjectElement(token, Object.keys(iniOrSection)[keyIdx], iniOrSection);
}

module.exports = {
  parse: decode,
  decode,
  stringify: encode,
  encode,
  safe,
  unsafe,
  createCommentToken,
  insertCommentBefore
}
