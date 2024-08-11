
/*
 * MT管理器
 * @tips MT论坛签到
 * @author https://github.com/hhhanzzz
 * @update 2024/08/11
 * @tg https://t.me/hhhan_script
*/

/*
变量填写方式如下 多账号@或者换行
export mt_manager = "手机号#密码"

[MITM]
hostname = bbs.binmt.cc

每日1-2次
const $ = new Env('MT管理器')
cron: 44 7,17 * * *
*/

const $ = new Env('MT管理器')
const { JSDOM } = require('jsdom')

let cookie = ''
let cookieArr = [], envName = 'mt_manager', host = `bbs.binmt.cc`
cookie = cookie || process.env[envName]

!(async () => {
  $.cookie = cookie
  $.cookieArr = cookieArr

  if (!$.envFormat(envName)) return
  console.log(`\n共${cookieArr.length}个账号`)

  for (let i = 0; i < cookieArr.length; i++) {
    cookie = cookieArr[i]
    $.username = cookie.split('#')[0]
    $.password = cookie.split('#')[1]

    await login()
    await signInfo()
    $.log(`\n******* 【账号${i + 1}】${$.nickName || ''} ******* `, { notify: true })
    if (!$.nickName) return $.log(`登录失败或用户名密码错误`)
    await signIn()
    await userInfo()

  }

})().catch(e => {
  $.log('', `❗️${$.name}, 错误!`, e.stack)
}).finally(() => {
  $.done()
})

async function login() {
  let loginPage = await $.request({
    fn: 'get_loginPage',
    method: 'get',
    ...taskUrl(`member.php?mod=logging&action=login&infloat=yes&handlekey=login&inajax=1&ajaxtarget=fwin_content_login`),
    timeout: 10000
  })
  const { window: { document } } = new JSDOM(`${loginPage.body}`)
  $.loginhash = loginPage.body.match(/loginhash=[\w]{5}/) && loginPage.body.match(/loginhash=[\w]{5}/)[0]?.replace('loginhash=', '')
  $.formhash = document.querySelector('input[name=formhash]')?.value
  cookie = loginPage.headers['set-cookie'].join('; ')

  let { headers } = await $.request({
    fn: 'login',
    method: 'post',
    ...taskUrl(`member.php?mod=logging&action=login&loginsubmit=yes&handlekey=login&loginhash=${$.loginhash}&inajax=1`, {
      formhash: $.formhash,
      referer: `https://${host}/`,
      loginfield: 'username',
      username: $.username,
      password: $.password,
      questionid: 0,
      answer: '',
      cookietime: '2592000'
    })
  })
  cookie = cookie + headers['set-cookie'].join('; ')
}

async function userInfo() {
  let res = await $.http({
    fn: 'userInfo',
    method: 'get',
    ...taskUrl(`home.php?mod=spacecp&ac=credit&showcredit=1`)
  })
  const { window: { document } } = new JSDOM(`${res}`)
  $.golds = document.querySelector('.creditl li:first-child')?.innerHTML.match(/\d+/)[0]
  $.goodComments = document.querySelector('.creditl li:nth-child(2)')?.innerHTML.match(/\d+/)[0]
  $.credibility = document.querySelector('.creditl li:nth-child(3)')?.innerHTML.match(/\d+/)[0]
  $.points = document.querySelector('.creditl li:nth-child(4)')?.innerHTML.match(/\d+/)[0]

  $.log(`\n连续签到天数：${$.signDays}`, `总签到天数：${$.totalDays}`, `签到等级：${$.signLevel}`, `积分奖励：${$.signReward}`, `签到排名：${$.signPK}`, `\n好评：${$.goodComments}`, `信誉：${$.credibility}`, `金币：${$.golds}`, `积分：${$.points}`)
}

async function signInfo() {
  let res = await $.http({
    fn: 'signInfo',
    method: 'get',
    ...taskUrl(`k_misign-sign.html`)
  })
  const { window: { document } } = new JSDOM(`${res}`)
  $.nickName = document.querySelector('a.author')?.innerHTML
  $.signDays = document.querySelector('#lxdays')?.value
  $.signLevel = document.querySelector('#lxlevel')?.value
  $.signReward = document.querySelector('#lxreward')?.value
  $.totalDays = document.querySelector('#lxtdays')?.value
  $.signPK = document.querySelector('#qiandaobtnnum')?.value
  $.formhash = document.querySelector('input[name=formhash]')?.value
}

async function signIn() {
  let res = await $.http({
    fn: 'signIn',
    method: 'get',
    ...taskUrl(`plugin.php?id=k_misign:sign&operation=qiandao&format=text&formhash=${$.formhash}`)
  })
  if (res.includes('已签到')) {
    $.log(`签到成功`, { notify: true })
  } else if (res.includes('今日已签')) {
    $.log(`今日已签`, { notify: true })
  }
  await signInfo()
}

function taskUrl(path, body) {
  let options = {
    url: `https://${host}/${path}`,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      'Cookie': cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }
  if (body) {
    options.body = $.queryStr(body)
  }
  return options
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
    envFormat(envName) {
      if (this.cookieArr.length) return true
      if (this.cookie) {
        this.splitor = this.envSplitor.find(sp => this.cookie.includes(sp)) || this.splitor
        this.cookie.split(this.splitor).forEach(cookie => this.cookieArr.push(cookie))
        return true
      } else {
        this.log(`\n未填写变量[${envName}]`, { notify: true })
        return
      }
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
    async done(opts = {}) {
      this.notifyFlag && await this.sendMsg()
      const endTime = new Date().getTime()
      const costTime = (endTime - this.startTime) / 1000
      this.log(`\n[${this.name}], 结束! 🕛 ${costTime} 秒`, { time: true, prefixless: true, fmt: 'hh:mm:ss' })
      process.exit(1)
    }
  })(name, opts)
}