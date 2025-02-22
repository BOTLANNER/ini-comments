An ini format parser and serializer for node.

Sections are treated as nested objects.  Items before the first
heading are saved on the object directly.

## Usage

Consider an ini-file `config.ini` that looks like this:
```ini
    ; this comment is being ignored
    scope = global

    [database]
    user = dbuser
    password = dbpassword
    database = use_this_database

    [paths.default]
    datadir = /var/lib/data
    array[] = first value
    array[] = second value
    array[] = third value
```

You can read, manipulate and write the ini-file like so:

```js
    var fs = require('fs')
      , ini = require('ini')

    var config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'))

    config.scope = 'local'
    config.database.database = 'use_another_database'
    config.paths.default.tmpdir = '/tmp'
    delete config.paths.default.datadir
    config.paths.default.array.push('fourth value')

    fs.writeFileSync('./config_modified.ini', ini.stringify(config, { section: 'section' }))
```

This will result in a file called `config_modified.ini` being written
to the filesystem with the following content:

```ini
    [section]
    scope=local
    [section.database]
    user=dbuser
    password=dbpassword
    database=use_another_database
    [section.paths.default]
    tmpdir=/tmp
    array[]=first value
    array[]=second value
    array[]=third value
    array[]=fourth value
```

## API

### decode(inistring, [options])

Decode the ini-style formatted `inistring` into a nested object.

The `options` object may contain the following:

* `bracketedArray` Boolean to specify whether array values are appended
  with `[]`.  By default this is true but there are some ini parsers
  that instead treat duplicate names as arrays.
* `retainComments` Boolean to specify whether comments should be retained and tracked. (NOTE: The `sort` option is not available when comments are retained)

### parse(inistring, [options])

Alias for `decode(inistring, [options])`

### encode(object, [options])

Encode the object `object` into an ini-style formatted string. If the
optional parameter `section` is given, then all top-level properties
of the object are put into this section and the `section`-string is
prepended to all sub-sections, see the usage example above.

The `options` object may contain the following:

* `align` Boolean to specify whether to align the `=` characters for
  each section. This option will automatically enable `whitespace`.
  Defaults to `false`.
* `section` String which will be the first `section` in the encoded
  ini data.  Defaults to none.
* `sort` Boolean to specify if all keys in each section, as well as
  all sections, will be alphabetically sorted.  Defaults to `false`.
* `whitespace` Boolean to specify whether to put whitespace around the
  `=` character.  By default, whitespace is omitted, to be friendly to
  some persnickety old parsers that don't tolerate it well.  But some
  find that it's more human-readable and pretty with the whitespace.
  Defaults to `false`.
* `newline` Boolean to specify whether to put an additional newline
  after a section header. Some INI file parsers (for example the TOSHIBA
  FlashAir one) need this to parse the file successfully.  By default,
  the additional newline is omitted.
* `platform` String to define which platform this INI file is expected
  to be used with: when `platform` is `win32`, line terminations are
  CR+LF, for other platforms line termination is LF.  By default, the
  current platform name is used.
* `bracketedArray` Boolean to specify whether array values are appended
  with `[]`.  By default this is true but there are some ini parsers
  that instead treat duplicate names as arrays.
* `retainComments` Boolean to specify whether comments should be retained and tracked. (NOTE: The `sort` option is not available when comments are retained)

For backwards compatibility reasons, if a `string` options is passed
in, then it is assumed to be the `section` value.

### stringify(object, [options])

Alias for `encode(object, [options])`

### safe(val)

Escapes the string `val` such that it is safe to be used as a key or
value in an ini-file. Basically escapes quotes. For example

```js
    ini.safe('"unsafe string"')
```
 
would result in

    "\"unsafe string\""

### unsafe(val)

Unescapes the string `val`

### insertCommentBefore(comment, before, iniOrSection)

Inserts the string `comment` into before the provided `before` key for the given ini or section. (NOTE: This function returns a new object with the inserted comment at the correct place. For correct placement, ensure to use the returned object and not the original) Also note, this will only provide meaningfull output when combine with `retainComments` set to `true` on your `options` for `encode`/`decode`.
