const notify = {
  success: msn => {
    const notification = document.querySelector('.notification')
    notification.innerHTML = msn
    notification.classList.remove('is-danger', 'hide')
    notification.classList.add('is-success', 'show')
    notify.close()
  },
  error: msn => {
    const notification = document.querySelector('.notification')
    notification.innerHTML = msn
    notification.classList.remove('is-success', 'hide')
    notification.classList.add('is-danger', 'show')
    notify.close()
  },
  close: () => {
    setTimeout(() => {
      const notification = document.querySelector('.notification')
      notification.classList.remove('show')
      notification.classList.add('hide')
    }, 2000)
  }
}
const load = {
  show: () => {
    const loading = document.querySelector('.lds-roller')
    const overlay = document.querySelector('.overlay')
    overlay.classList.remove('hidden')
    loading.classList.remove('hide')
    loading.classList.add('show')
  },
  hide: () => {
    const loading = document.querySelector('.lds-roller')
    const overlay = document.querySelector('.overlay')
    loading.classList.remove('show')
    loading.classList.add('hide')
    overlay.classList.add('hidden')
  }
}
const infoTorrent = (info) => {
  document.querySelector('#urlViewTorrent').innerHTML = ((info || {}).message || {}).view || '' 
  document.querySelector('#infoTorrent').innerHTML = ((info || {}).message || {}).source || ''
  document.querySelector('#pathTorrent').innerHTML = ((info || {}).message || {}).path || ''
};
window.onload = () => {
  const baseURL = 'http://localhost:3000/'
  document.querySelector('.file-name').innerHTML = '.torrent'
  document.querySelector('#submitTorrent').addEventListener('click', function () {
    const file = document.querySelector('#fileName')
    if (file.files.length !== 0) {
      infoTorrent()
      load.show()       
      let formData = new FormData()
      formData.append('file', file.files[0])
      const options = {
        method: 'POST',
        body: formData
      }
      fetch(`${baseURL}upload`, options).then(response => {
        response.json().then(res => {
          fetch(`${baseURL}play-torrent?file=${res.fileName}`).then(info => {
            info.json().then(infoExtra => {
              load.hide()
              notify.success('Operación realizada correctamente')
              infoTorrent(infoExtra)
            }).catch(err => {
              notify.error('Error info extra')
            })
          }).catch(err => {
            load.hide()
            notify.error('Error info play')
          })
        })
      }).catch(err => {
        load.hide()
        notify.error('Error')
      })
    } else {
      notify.error('Es necesario añadir un fichero .torrent')
    }
  })
  document.querySelector('input[type=file]').addEventListener('change', function () {
    document.querySelector('.file-name').innerHTML = this.value.split('\\')[this.value.split('\\').length - 1]
  })
};
