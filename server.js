var fs = require('fs')
var path = require('path')
var parse = require('co-busboy')
var send = require('koa-send')
var logger = require('koa-logger')
var execSync = require('child_process').execSync
var modifyFilename = require('modify-filename')
var serve = require('koa-static')
var koa = require('koa')

var app = koa()

// Init logger
app.use(logger())

// Init public dir for css, js and etc..
app.use(serve(__dirname + '/public'))

app.use(function *(next) {
  // ignore non-GETs
  if ('GET' !== this.method) return yield next

  if (this.path === '/') {
    var indexHTML = fs.readFileSync(__dirname + '/public/index.html', 'utf-8')
    this.body = indexHTML
  } else if (this.path.slice(0, 5) === '/tmp/') {
    yield send(this, this.path.slice(5), { root: __dirname + '/tmp' })
  }
})

app.use(function *(next) {
  // ignore non-POSTs
  if ('POST' !== this.method) return yield next

  // multipart upload
  var parts = parse(this)
  var part
  var locations = []
  var location

  while (part = yield parts) {
    location = path.join('tmp', part.filename)
    var stream = fs.createWriteStream(location)
    part.pipe(stream)
    locations.push(location)
    console.log('uploading %s -> %s', part.filename, stream.path)
  }

  var newlocation = modifyFilename(location, (f, x) => f + '-splitted' + x)
  execSync(`${__dirname}/mutool poster -x 2 '${location}' '${newlocation}'`)
  console.log('serving file', newlocation)
  this.redirect(newlocation)
})

var port = process.env.PORT || 5000
app.listen(port)
console.log('Listening to %s', port)
