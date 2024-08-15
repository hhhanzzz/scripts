

/*
 * 巴奴毛肚火锅小程序
 * @tips 签到
 * @author https://github.com/hhhanzzz
 * @update 2024/08/15
 * @tg https://t.me/hhhan_script
*/

/*
抓取 cloud.banu.cn 域名请求 url 的 member_id 字段

变量填写方式如下, 多账号换行隔开
export bnmdhgCookie = "member_id"

[MITM]
hostname = cloud.banu.cn

每日1-2次
const $ = new Env('巴奴毛肚火锅')
cron: 15 10,15 * * *
*/

const $ = new Env('巴奴毛肚火锅')
const CryptoJS = require('crypto-js')

const envPrefix = 'bnmdhg'
const envName = envPrefix + 'Cookie', configName = envPrefix, threadName = envPrefix + 'ThreadNum'

const threadFlag = !true, prefixFlag = true, timeFlag = !true

const notifyFlag = true, cacheFlag = !true

const MAX_THREAD = process.env[threadName] || 10 //默认最大并发数
const DEFAULT_TIMEOUT = 8000, DEFAULT_RETRY = 5

let cookie = ``, cookieArr = []
let host = `cloud.banu.cn`
cookie = cookie || process.env[envName]

class UserInfo extends $.BasicClass {
  constructor(user) {
    super(configInit())
    Object.assign(this, user)

    this.member_id = this.userCookie
    this.uuid = this.randomString(16, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')

    this.taskInit()
  }

  taskInit(opts = {}) {
    this.got = this.got.extend({
      headers: {
        'uuid': this.uuid,
        'tenancy_id': 'banu',
        'version': '6.2.6',
        'platform_version_name': 'iPhone 13 mini<iPhone14,4>',
        'platform_version_code': 'iOS 17.0',
        'platform_version_weapp': '8.0.50',
        'platform_version_sdk': '3.5.3',
        "User-Agent": `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50(0x18003237) NetType/WIFI Language/zh_CN`,
      }
    })
  }

  async userInfo() {
    let valid = false
    try {
      let options = {
        fn: 'userInfo',
        method: 'get',
        url: `https://cloud.banu.cn/api/member/basic?member_id=${this.member_id}`,
      }
      let res = await this.http(getSignHeader(options))
      if (res.code == 200) {
        let { mobile, points } = res.data
        this.nickName = mobile
        this.points = points
        valid = true
      } else {
        this.log(`获取用户信息失败: ${res.message}`)
      }
    } catch (e) {
      console.log(e)
    } finally {
      return this.valid = valid
    }
  }

  async signInfo() {
    try {
      let options = {
        fn: 'signInfo',
        method: 'get',
        url: `https://cloud.banu.cn/api/sign-in/days?member_id=${this.member_id}`,
      }
      let res = await this.http(getSignHeader(options))
      if (res.code == 200) {
        let { is_sign_in, days } = res.data
        is_sign_in ? this.log(`今日已签到`) : await this.signIn()
      } else {
        this.log(res.message)
      }
    } catch (e) {
      console.log(e)
    }
  }

  async signIn() {
    try {
      let options = {
        fn: 'signIn',
        method: 'post',
        url: `https://cloud.banu.cn/api/sign-in`,
        headers: {
          code: this.randomString(32, '0123456789abcdefghijklmnopqrstuvwxyz')
        },
        json: encryptBody({
          member_id: this.member_id
        })
      }
      let res = await this.http(getSignHeader(options))
      if (res.code == 200) {
        this.log(`签到成功`)
      } else {
        this.log(res.message)
      }
    } catch (e) {
      console.log(e)
    }
  }

  async dailyTask() {
    try {
      await this.signInfo()

    } catch (e) {
      console.log(e)
    }

  }

  // 主任务
  async userTask(opts) {
    try {
      await this.userInfo()
      if (!this.valid) {
        this.log(`cookie疑似失效`, { notify: true, prefix: true })
        return
      }

      this.log(`\n******* 【账号${this.userIdx}】${this.nickName || ''} ******* `, {
        console: !this.prefixFlag,
        prefixless: true,
        timeless: true,
        notify: !this.prefixFlag
      })
      await this.dailyTask()

      await this.userInfo()
      this.points ? this.log(`积分: ${this.points}`, { notify: true }) : ''
    } catch (e) {
      console.log(e)
    }

  }
}

!(async () => {
  const options = {
    Class: UserInfo,
  }
  await $.readEnv(configInit(options))

  if (threadFlag) {
    await $.threadTask('userTask')
  } else {
    for (let user of $.userList) {
      await user.userTask()
    }
  }

})().catch(e => {
  $.log('', `❗️${$.name}, 错误!`, e.stack)
}).finally(() => {
  $.done()
})

function encryptBody(opts = {}) {
  let key = 'bfc5e947cd84c7ced1ee48d28fb3e90f'
  let iv = (16, CryptoJS.lib.WordArray.random(16)).toString()
  let encrypted_data = encrypt_data(JSON.stringify(opts), key, iv)
  return {
    enc_data: CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify({
      iv,
      encrypted_data
    })))
  }

  function encrypt_data(str, key, iv) {
    key = CryptoJS.enc.Utf8.parse(key)
    iv = CryptoJS.enc.Utf8.parse(iv)
    return CryptoJS.AES.encrypt(str, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC
    }).toString()
  }
}

function getSignHeader(opts = {}) {
  let app_key = '5lOrfCGW'
  let app_secret = '6dfzNDNkyi'
  let t = Math.floor(Date.now() / 1000)
  let n = $.randomString(16, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')

  let signStr = t + n + app_key + app_secret
  let sign = CryptoJS.MD5(CryptoJS.MD5(signStr).toString()).toString().split('').reverse().join('')

  let headers = {
    app_key, t, n, sign,
  }

  opts.headers = Object.assign(headers, opts.headers)

  return opts
}

function configInit(opts = {}) {
  let options = {
    cookie, cookieArr, envName, configName, notifyFlag, threadFlag, prefixFlag, timeFlag, cacheFlag, DEFAULT_TIMEOUT, DEFAULT_RETRY, MAX_THREAD
  }
  return Object.assign(options, opts)
}

// prettier-ignore
function Env(name, opts) {
  class BasicClass {
    constructor(opts) {
      this.userIdx = 0
      this.userList = []
      this.logSeparator = '\n'
      this.splitor = '\n'
      this.envSplitor = ['\n', '@', '&']
      this.ts_len = 13
      this.waitInterval = 1000
      this.waitLimit = 3600000
      this.waitAhead = 0
      this.date = new Date().getDate()
      this.day = new Date().getDay()
      this.hour = new Date().getHours()
      this.configInit(opts)
    }
    configInit(opts = {}) {
      let {
        cookie = '',
        cookieArr = [],
        cacheArr = [],
        envName = '',
        configName = '',
        currentVersion = '',
        notifyFlag = false,
        threadFlag = false,
        proxyFlag = false,
        prefixFlag = false,
        timeFlag = false,
        cacheFlag = false,
        cacheFile = '',
        exchangeFlag = false,
        notifyHour = '',
        DEFAULT_TIMEOUT = 8000,
        DEFAULT_RETRY = 5,
        MAX_THREAD = 10
      } = opts
      this.retryNum = DEFAULT_RETRY
      this.cookie = cookie.trim()
      this.cookieArr = cookieArr

      this.notifyStr = []
      this.notifyHour = notifyHour
      this.notifyFlag = notifyFlag

      this.threadFlag = threadFlag
      this.proxyFlag = proxyFlag
      this.prefixFlag = prefixFlag
      this.timeFlag = timeFlag
      this.exchangeFlag = exchangeFlag
      threadFlag ? this.prefixFlag = true : ''
      exchangeFlag ? this.timeFlag = true : ''

      this.cacheArr = cacheArr
      this.cacheFlag = cacheFlag
      this.cacheFile = cacheFile || envName + '.json'

      this._fs = this._fs ? this._fs : require('fs')
      this._path = this._path ? this._path : require('path')
      this.got = this.got ? this.got : require('got')
      this.got = this.got.extend({
        retry: { limit: 0 },
        timeout: DEFAULT_TIMEOUT,
        followRedirect: false,
      })

      this.envName = envName
      this.configName = configName
      this.currentVersion = currentVersion

      this.MAX_THREAD = parseInt(MAX_THREAD)
    }
    ts(type = this.ts_len) {
      let date = new Date()
      let res = ''
      switch (type) {
        case 10:
          res = Math.round(date.getTime() / 1000)
          break
        case 13:
          res = Math.round(date.getTime())
          break
        case 'y':
          res = date.getFullYear()
          break
        case 'M':
          res = date.getMonth() + 1
          break
        case 'd':
          res = date.getDate()
          break
        case 'h':
          res = date.getHours()
          break
        case 'm':
          res = date.getMinutes()
          break
        default:
          res = '未知错误, 请检查'
          break
      }
      return res
    }
    toObj(str, defaultValue = str) {
      try {
        return JSON.parse(str)
      } catch {
        return defaultValue
      }
    }
    toStr(obj, defaultValue = obj) {
      try {
        return JSON.stringify(obj)
      } catch {
        return defaultValue
      }
    }
    randomNum(min, max) {
      return Math.floor(Math.random() * (max - min + 1) + min)
    }
    randomPattern(pattern, charset = 'abcdef0123456789') {
      let str = ''
      for (let chars of pattern) {
        if (chars == 'x') {
          str += charset.charAt(Math.floor(Math.random() * charset.length))
        } else if (chars == 'X') {
          str += charset.charAt(Math.floor(Math.random() * charset.length)).toUpperCase()
        } else {
          str += chars
        }
      }
      return str
    }
    randomString(len, charset = 'abcdef0123456789') {
      let str = ''
      for (let i = 0; i < len; i++) {
        str += charset.charAt(Math.floor(Math.random() * charset.length))
      }
      return str
    }
    log(...logs) {
      if (logs.length <= 0) return
      let logPrefix = ''
      let opts = { console: true }
      if (logs.length > 1 && logs.at(-1) instanceof Object) Object.assign(opts, logs.pop())

      if (!opts.timeless) {
        if (opts.time || this.timeFlag) {
          let fmt = opts.fmt || 'hh:mm:ss'
          this.exchangeFlag ? fmt = opts.fmt || 'hh:mm:ss.S' : ''
          logPrefix = `[${this.time(fmt)}]`
        }
      }

      if (!opts.prefixless) {
        if (opts.prefix || this.prefixFlag) {
          if (opts.logPrefix) {
            logPrefix += opts.logPrefix
          } else if (this.logPrefix) {
            logPrefix += this.logPrefix
          } else if (this.user) {
            let { userIdx, nickName, remark } = this.user
            logPrefix += `账号[${userIdx}]`
            if (remark || nickName) logPrefix += `[${remark || nickName}]`
          } else if (this.userIdx || this.index) {
            logPrefix += `账号[${this.userIdx || this.index}]`
            if (this.remark || this.nickName) logPrefix += `[${this.remark || this.nickName}]`
          }
        }
      }

      logs = logs.map(log => {
        if (typeof log !== 'string') log = this.toStr(log)
        return log ? (log.startsWith('\n') ? `\n${logPrefix}${log.substring(1)}` : `${logPrefix}${log}`) : log
      })
      if (opts.notify) $.notifyStr = [...$.notifyStr, ...logs]
      if (opts.console) console.log(logs.join(this.logSeparator))
    }
    time(fmt, ts = null) {
      const date = ts ? new Date(ts) : new Date()
      let o = {
        'M+': date.getMonth() + 1,
        'd+': date.getDate(),
        'H+': date.getHours(),
        'h+': date.getHours(),
        'm+': date.getMinutes(),
        's+': date.getSeconds(),
        'q+': Math.floor((date.getMonth() + 3) / 3),
        'S': date.getMilliseconds()
      }
      if (/(y+)/.test(fmt))
        fmt = fmt.replace(
          RegExp.$1,
          (date.getFullYear() + '').substr(4 - RegExp.$1.length)
        )
      for (let k in o)
        if (new RegExp('(' + k + ')').test(fmt))
          fmt = fmt.replace(
            RegExp.$1,
            RegExp.$1.length == 1
              ? o[k]
              : ('00' + o[k]).substr(('' + o[k]).length)
          )
      return fmt
    }
    normalizeTs(ts, opts = {}) {
      let ts_len = opts.len || this.ts_len
      ts = ts.toString()
      while (ts.length < ts_len) ts += '0'
      ts.length > ts_len && (ts = ts.slice(0, ts_len))
      return parseInt(ts)
    }
    wait(time) {
      return new Promise((resolve) => setTimeout(resolve, time))
    }
    async randomWait(min, max, opts = {}) {
      let waitTime = Math.random() * (max - min) + min
      this.log(`随机等待${waitTime.toFixed(2)}秒`, { console: opts.console })
      await this.wait(waitTime * 1000)
    }
    async request(opts = {}) {
      let resp = null, count = 0
      let fn = opts.fn || opts.url
      let DEFAULT_RETRY = this.retryNum || 3
      this.got = this.got ? this.got : require('got')
      opts.method = opts?.method?.toUpperCase() || 'GET'
      while (count++ < DEFAULT_RETRY) {
        try {
          let err = null
          const errcodes = ['ECONNRESET', 'EADDRINUSE', 'ENOTFOUND', 'EAI_AGAIN']
          await this.got(opts).then(t => {
            resp = t
          }, e => {
            err = e
            resp = e.response
          })
          if (err) {
            if (err.name == 'TimeoutError') {
              this.log(`[${fn}]请求超时(${err.code})，重试第${count}次`)
            } else if (errcodes.includes(err.code)) {
              this.log(`[${fn}]请求错误(${err.code})，重试第${count}次`)
            } else {
              let statusCode = resp?.statusCode || -1
              this.log(`[${fn}]请求错误(${err.message}), 返回[${statusCode}]`)
              break
            }
          } else {
            break
          }
        } catch (e) {
          this.log(`[${fn}]请求错误(${e.message})，重试第${count}次`)
        }
      }
      if (!resp) return { statusCode: -1, headers: null, body: null }
      let { statusCode = -1, headers = null, body = null } = resp
      if (body) try { body = JSON.parse(body) } catch { };
      return { statusCode, headers, body }
    }
    async http(opts = {}) {
      try {
        let { body } = await this.request(opts)
        return body
      } catch (e) {
        this.log(e.stack)
      }
    }
  }
  return new (class extends BasicClass {
    constructor(opts) {
      super(opts)
      this.name = name
      this.encoding = 'utf-8'
      this.startTime = new Date().getTime()
      this.BasicClass = BasicClass
      Object.assign(this, opts)
      this.log(`\n[${this.name}], 开始!`, { time: true })
    }
    require(fileName) {
      let res = ''
      try {
        let pathList = [
          `./${fileName}`, `./utils/${fileName}`, `../${fileName}`, `../utils/${fileName}`,
        ]
        for (let path of pathList) {
          try {
            res = require(path)
            break
          } catch (e) {
            continue
          }
        }
        if (!res) console.log(`[${fileName}.js]文件疑似不存在`)
      } catch (e) {
        console.log(`导入[${fileName}.js]文件失败`)
      } finally {
        return res
      }
    }
    queryStr(opts) {
      let qs = ''
      for (const key in opts) {
        let value = opts[key]
        if (value != null) {
          if (typeof value === 'object') {
            value = JSON.stringify(value)
          }
          qs += `${key}=${value}&`
        }
      }
      qs = qs.substring(0, qs.length - 1)
      return qs
    }
    async readEnv(opts = {}) {
      this.configInit(opts)
      if (this.cookie) {
        this.splitor = this.envSplitor.find(sp => this.cookie.includes(sp))
        this.cookieArr = [...this.cookie.split(this.splitor), ...this.cookieArr]
      }
      try {
        this.cacheFlag && this.readCache(this.cacheFile)
        let cache_tokenArr = this.cacheArr.map(({ userCookie }) => userCookie)
        let tokenArr = this.config?.token || cache_tokenArr
        if (this.cookieArr.length == 0) this.cookieArr = [...tokenArr]
      } catch (e) {
        console.log(e)
      }
      this.cookieArr = [...new Set(this.cookieArr.filter(cookie => cookie))]
      for (let cookie of this.cookieArr) {
        let userIdx = this.cookieArr.indexOf(cookie) + 1
        let user = {
          userIdx, userCookie: cookie, valid: true,
        }
        if (this.cacheFlag) {
          let cache_user = this.cacheArr[userIdx - 1] || {}
          user = Object.assign(cache_user, user)
        }
        if (opts.Class) user = new opts.Class(user)
        this.userList.push(user)
      }
      if (!this.userList.length) {
        this.log(`\n未填写变量[${envName}]`, { notify: true })
        return
      }
      this.log(`\n-----------`, { timeless: true })
      this.log(`推送: ${this.notifyFlag}`, `账号前缀: ${this.prefixFlag}`, `时间前缀: ${this.timeFlag}`, { timeless: true })
      this.log(`并发: ${this.threadFlag}`, { console: !this.threadFlag, timeless: true })
      this.log(`最大并发数: ${+this.MAX_THREAD || this.userList.length}`, { console: this.threadFlag, timeless: true })
      this.log(`当前版本: ${this.currentVersion}`, { console: this.currentVersion, timeless: true })
      this.log(`-----------`, { timeless: true })
      this.log(`\n共${this.userList.length}个账号`, { timeless: true })
      return true
    }
    async sendMsg() {
      if (!this.notifyStr.length) return
      if (this.notifyHour && this.hour < this.notifyHour) return
      try {
        let notify = this.require('sendNotify')
        console.log('\n------------ 推送 ------------')
        await notify.sendNotify(this.name, this.notifyStr.join('\n'))
      } catch (e) {
        console.log('读取推送依赖[sendNotify.js]失败, 请检查目录下是否存在此依赖')
      }
    }
    async threads(taskName, opts = {}) {
      while (opts.idx < this.userList.length) {
        let user = this.userList[opts.idx++]
        if (!user || !user.valid) continue
        await user[taskName](opts)
      }
    }
    async threadTask(taskName, opts = {}) {
      let taskAll = []
      let taskConf = Object.assign({ idx: 0 }, opts)
      let threadCount = taskConf.thread || +this.MAX_THREAD || this.userList.length
      while (threadCount--) taskAll.push(this.threads(taskName, taskConf))
      await Promise.all(taskAll)
    }
    async done(opts = {}) {
      this.notifyFlag && await this.sendMsg()
      const endTime = new Date().getTime()
      const costTime = (endTime - this.startTime) / 1000
      this.log(`\n[${this.name}], 结束! 🕛 ${costTime} 秒`, { time: true, prefixless: true, fmt: 'hh:mm:ss' })
      process.exit(1)
    }
  })(name, opts)
}