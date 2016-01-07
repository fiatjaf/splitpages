var fs = require('fs')
var path = require('path')
var os = require('os')
var parse = require('co-busboy')
var sendfile = require('koa-sendfile')
var logger = require('koa-logger')
var spawnSync = require('child_process').spawnSync
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

  var indexHTML = fs.readFileSync(__dirname + '/public/index.html', 'utf-8')
  this.body = indexHTML
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
    location = path.join(os.tmpdir(), part.filename)
    var stream = fs.createWriteStream(location)
    part.pipe(stream)
    locations.push(location)
    console.log('uploading %s -> %s', part.filename, stream.path)
  }

  var newlocation = modifyFilename(location, (f, x) => f + '-splitted' + x)
  spawnSync('./mutool', ['poster', '-x', '2', location, newlocation])
  yield* sendfile.call(this, newlocation)
  if (!this.status) this.throw(404)
})

var port = process.env.PORT || 5000
app.listen(port)
console.log('Listening to %s', port)
