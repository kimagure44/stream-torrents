const clivas = require('clivas')
const numeral = require('numeral')
const os = require('os')
os.tmpDir = os.tmpdir
const address = require('network-address')
const proc = require('child_process')
const peerflix = require('./')
const keypress = require('keypress')
const parsetorrent = require('parse-torrent')
const bufferFrom = require('buffer-from')
const express = require('express')
const app = express()
const fileUpload = require('express-fileupload')
const fs = require('fs')
const port = 3000

app.use(fileUpload())
app.post('/upload', (req, res) => {
  const dir = './torrents'
  const EDFile = req.files.file
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  EDFile.mv(`./torrents/${EDFile.name}`, err => {
    const msn = {
      code: err ? 500 : 200,
      message: err || 'File upload',
      fileName: err ? '' : `./torrents/${EDFile.name}`
    }
    return res.status(err ? 500 : 200).send(msn)
  })
})
app.get('/play-torrent', (req, res) => {
  let argv = {
    l: false,
    list: false,
    v: false,
    vlc: false,
    a: false,
    all: false,
    m: false,
    mplayer: false,
    g: false,
    smplayer: false,
    boolean: false,
    k: false,
    mpv: false,
    o: false,
    omx: false,
    w: false,
    webplay: false,
    j: false,
    jack: false,
    n: false,
    'no-quit': false,
    r: true,
    remove: true,
    d: false,
    'not-on-top': false,
    f: 'd:\\',
    path: 'd:\\',
    c: 100,
    connections: 100,
    p: 8888,
    port: 8888
  }

  var filename = req.query.file

  const watchVerifying = engine => {
    const showVerifying = i => {
      const percentage = Math.round(((i + 1) / engine.torrent.pieces.length) * 100.0)
      clivas.clear()
      clivas.line(`{yellow:Verifying downloaded:} ${percentage} %`)
    }

    const startShowVerifying = () => {
      showVerifying(-1)
      engine.on('verify', showVerifying)
    }

    const stopShowVerifying = () => {
      clivas.clear()
      engine.removeListener('verify', showVerifying)
      engine.removeListener('verifying', startShowVerifying)
    }

    engine.on('verifying', startShowVerifying)
    engine.on('ready', stopShowVerifying)
  }

  const ontorrent = torrent => {
    if (argv['peer-port']) argv.peerPort = Number(argv['peer-port'])

    const engine = peerflix(torrent, argv)
    let hotswaps = 0
    let verified = 0
    let invalid = 0
    let downloadedPercentage = 0

    engine.on('verify', () => {
      verified++
      downloadedPercentage = Math.floor(verified / engine.torrent.pieces.length * 100)
    })

    engine.on('invalid-piece', () => { invalid++ })

    const bytes = num => numeral(num).format('0.0b')

    engine.on('hotswap', () => { hotswaps++ })

    const started = Date.now()
    const wires = engine.swarm.wires
    const swarm = engine.swarm

    const active = wire => !wire.peerChoking

    const peers = [].concat(argv.peer || [])
    peers.forEach(peer => { engine.connect(peer) })

    if (argv['on-downloaded']) {
      let downloaded = false
      engine.on('uninterested', () => {
        if (!downloaded) proc.exec(argv['on-downloaded'])
        downloaded = true
      })
    }

    engine.server.on('listening', function () {
      const host = argv.hostname || address()
      var href = `http://${host}:${engine.server.address().port}/`
      var localHref = `http://localhost:${engine.server.address().port} + '/'`
      var filename = engine.server.index.name.split('/').pop().replace(/\{|\}/g, '')
      var filelength = engine.server.index.length
      var player = null
      var paused = false
      var timePaused = 0
      var pausedAt = null

      if (argv.all) {
        filename = engine.torrent.name
        filelength = engine.torrent.length
        href += '.m3u'
        localHref += '.m3u'
      }

      var registry = (hive, key, name, cb) => {
        var Registry = require('winreg')
        var regKey = new Registry({
          hive: Registry[hive],
          key: key
        })
        regKey.get(name, cb)
      }
      if (argv['on-listening']) proc.exec(argv['on-listening'] + ' ' + href)
      if (argv.quiet) return console.log('server is listening on ' + href)
      process.stdout.write(bufferFrom('G1tIG1sySg==', 'base64')) // clear for drawing
      var interactive = !player && process.stdin.isTTY && !!process.stdin.setRawMode
      if (interactive) {
        keypress(process.stdin)
        process.stdin.on('keypress', (ch, key) => {
          if (!key) return
          if (key.name === 'c' && key.ctrl === true) return process.kill(process.pid, 'SIGINT')
          if (key.name === 'l' && key.ctrl === true) {
            let command = 'xdg-open'
            if (process.platform === 'win32') { command = 'explorer' }
            if (process.platform === 'darwin') { command = 'open' }
            return proc.exec(command + ' ' + engine.path)
          }
          if (key.name !== 'space') return
          if (player) return
          if (paused === false) {
            if (!argv.all) {
              engine.server.index.deselect()
            } else {
              engine.files.forEach(file => file.deselect())
            }
            paused = true
            pausedAt = Date.now()
            draw()
            return
          }
          if (!argv.all) {
            engine.server.index.select()
          } else {
            engine.files.forEach(file => file.select())
          }
          paused = false
          timePaused += Date.now() - pausedAt
          draw()
        })
        process.stdin.setRawMode(true)
      }
      let _unchoked = ''
      let _runtime = ''
      var draw = () => {
        var unchoked = engine.swarm.wires.filter(active)
        _unchoked = unchoked
        var timeCurrentPause = 0
        if (paused === true) {
          timeCurrentPause = Date.now() - pausedAt
        }
        var runtime = Math.floor((Date.now() - started - timePaused - timeCurrentPause) / 1000)
        _runtime = runtime
        var linesremaining = clivas.height
        var peerslisted = 0
        clivas.clear()
        clivas.line('{green:open} {bold:' + (player || 'vlc') + '} {green:and enter} {bold:' + href + '} {green:as the network address}')
        clivas.line('{yellow:info} {green:streaming} {bold:' + filename + ' (' + bytes(filelength) + ')} {green:-} {bold:' + bytes(swarm.downloadSpeed()) + '/s} {green:from} {bold:' + unchoked.length + '/' + wires.length + '} {green:peers}    ')
        clivas.line('{yellow:info} {green:path} {cyan:' + engine.path + '}')
        clivas.line('{yellow:info} {green:downloaded} {bold:' + bytes(swarm.downloaded) + '} (' + downloadedPercentage + '%) {green:and uploaded }{bold:' + bytes(swarm.uploaded) + '} {green:in }{bold:' + runtime + 's} {green:with} {bold:' + hotswaps + '} {green:hotswaps}     ')
        clivas.line('{yellow:info} {green:verified} {bold:' + verified + '} {green:pieces and received} {bold:' + invalid + '} {green:invalid pieces}')
        clivas.line('{yellow:info} {green:peer queue size is} {bold:' + swarm.queued + '}')
        clivas.line('{80:}')
        if (interactive) {
          var openLoc = ' or CTRL+L to open download location}'
          if (paused) clivas.line('{yellow:PAUSED} {green:Press SPACE to continue download' + openLoc)
          else clivas.line('{50+green:Press SPACE to pause download' + openLoc)
        }
        clivas.line('')
        linesremaining -= 9
        wires.every(wire => {
          var tags = []
          if (wire.peerChoking) tags.push('choked')
          clivas.line('{25+magenta:' + wire.peerAddress + '} {10:' + bytes(wire.downloaded) + '} {10 + cyan:' + bytes(wire.downloadSpeed()) + '/s} {15 + grey:' + tags.join(', ') + '}   ')
          peerslisted++
          return linesremaining - peerslisted > 4
        })
        linesremaining -= peerslisted
        if (wires.length > peerslisted) {
          clivas.line('{80:}')
          clivas.line('... and ' + (wires.length - peerslisted) + ' more     ')
        }
        clivas.line('{80:}')
        clivas.flush()
        clivas.line('')
        clivas.line('{80:}')
      }
      setInterval(draw, 500)
      return res.status(200).send({
        code: 200,
        message: {
          view: `Abre en VLC la siguinte URL ${href} para visualizar el fichero o pulsa <a href='${href}' target="_blank">aquí</a> para realizar la descarga`,
          source: `Fichero: ${filename} (${bytes(filelength)}) - ${bytes(swarm.downloadSpeed())}/s desde ${_unchoked.length}/${wires.length}`,
          path: `El fichero se descargara para su reproducción y/o guardado en la siguiente ruta: ${engine.path}`
        }
      })
      draw()
    })

    engine.server.once('error', () => engine.server.listen(0, argv.hostname))

    var onmagnet = () => {
      clivas.clear()
      clivas.line('{green:fetching torrent metadata from} {bold:' + engine.swarm.wires.length + '} {green:peers}')
    }

    if (typeof torrent === 'string' && torrent.indexOf('magnet:') === 0 && !argv.quiet) {
      onmagnet()
      engine.swarm.on('wire', onmagnet)
    }

    engine.on('ready', () => {
      engine.swarm.removeListener('wire', onmagnet)
      if (!argv.all) return
      engine.files.forEach(file => file.select())
    })

    var onexit = () => {
      clivas.line('')
      clivas.line('{yellow:info} {green:FLIX is exiting...}')
    }

    watchVerifying(engine)

    if (argv.remove) {
      var remove = () => {
        onexit()
        engine.remove(() => process.exit())
      }

      process.on('SIGINT', remove)
      process.on('SIGTERM', remove)
    } else {
      process.on('SIGINT', function () {
        onexit()
        process.exit()
      })
    }
  }

  parsetorrent.remote(filename, function (err, parsedtorrent) {
    if (err) {
      console.error(err.message)
      process.exit(1)
    }
    ontorrent(parsedtorrent)
  })
})
const interFace = Object.values(os.networkInterfaces()).map(c => c[1])
const addressInet1 = interFace[0].address
const addressInet2 = interFace[1].address
app.listen(port, () => console.log(`Server running in ${addressInet1}:${port} / ${addressInet2}:${port}`))
