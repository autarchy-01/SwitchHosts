/**
 * preload
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { Actions } from '@main/types'
import { contextBridge, ipcRenderer } from 'electron'
import { EventEmitter } from 'events'
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    _agent: typeof _agent;
  }
}

export type EventHandler = (...args: any[]) => void

const ee = new EventEmitter()

let x_get_idx = 0

const callAction = (action: keyof Actions, ...params: any[]) => {
  const callback = ['_cb', (new Date()).getTime(), x_get_idx++].join('_')

  return new Promise((resolve, reject) => {
    ipcRenderer.send('x_action', {
      action,
      data: params,
      callback,
    })

    ipcRenderer.once(callback, (sender, err, d) => {
      if (err) {
        reject(err)
      } else {
        resolve(d)
      }
    })
  })
}

const broadcast = <T>(event: string, data?: T) => {
  // 广播消息给所有 render 窗口
  ipcRenderer.send('x_broadcast', { event, data })
}

const on = (event: string, handler: EventHandler) => {
  ee.on(event, (d, ...args) => {
    console.log(`on [${event}]`)
    handler(d, ...args)
  })

  return () => off(event, handler)
}

const off = (event: string, handler: EventHandler) => {
  console.log(`off [${event}]`)
  ee.off(event, handler)
}

ipcRenderer.on('y_broadcast', (e, d) => {
  // 接收其他（包括当前） render 窗口广播的消息
  ee.emit(d.event, d.data)
})

ipcRenderer.send('x_reg')

// 窗口销毁时 unreg
window.addEventListener('beforeunload', () => {
  ipcRenderer.send('x_unreg')
})

const _agent = {
  call: callAction,
  broadcast,
  on,
  off,
  platform: process.platform,
}

contextBridge.exposeInMainWorld('_agent', _agent)