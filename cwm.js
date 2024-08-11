
/*
 * 刺猬猫阅读
 * @tips 签到、任务、检索宝箱
 * @author https://github.com/hhhanzzz
 * @update 2023/09/30
 * @tg https://t.me/hhhan_script
*/

/*
抓取 app.hbooker.com 域名的 login_token&account&device_token 3个字段

变量, 多账号@隔开: 
==========
export cwmCookie="login_token1&account1&device_token1@login_token2&account2&device_token2"
export chestId="" //获取宝箱起始id
export chestNum="" //获取宝箱数量
export isGetChest="" //是否获取宝箱信息
export readTimes="" //阅读记录时间,单位为秒。默认为300s，即5分钟。
==========

const $ = new Env('刺猬猫阅读')
cron: 11 0-23/2 * * *
*/
const axios = require("axios")
const CryptoJS = require("crypto-js")

let finishedTasklist = [], //已完成任务列表
  unfinishedTasklist = [], //未完成任务列表
  weekTaskList = [], //周任务列表
  challengeTask = "",
  shelfList = [], //书架id列表
  bookList = [], //小说列表
  bbsList = [], //插画列表
  readerList = [], //reader_id列表
  scrollChest = [], //滚动宝箱
  weekChest = [], //周宝箱
  chestId = process.env.chestId || '',
  chestNum = process.env.chestNum || "15",
  isGetChest = process.env.isGetChest || "true",
  readTimes = process.env.readTimes || "300",
  cwmCookie = '',
  cookie = "",
  cookieArr = [],
  envName = 'cwmCookie'

!(async () => {
  console.log(`\n[刺猬猫阅读], 开始!`);
  if (!await envFormat()) return
  console.log(
    `\n=========================================    \n脚本执行 - 北京时间(UTC+8)：${new Date(
      new Date().getTime() +
      new Date().getTimezoneOffset() * 60 * 1000 +
      8 * 60 * 60 * 1000
    ).toLocaleString()} \n=========================================\n`
  )

  console.log(`\n共${cookieArr.length}个账号`)
  let cookieIndex = 1
  for (let item of cookieArr) {
    cookie = item
    console.log(`\n*********【账号${cookieIndex}】*********`)

    let userInfo = await cwmGetInfo()
    if (!userInfo) continue
    console.log(`\n用户名：【${userInfo?.username}】`)
    console.log(`手机号：【${userInfo?.phone}】`)
    try {
      await getTask()
      // await getChestId()
      // await getMeta()
      // await get_carousel(readerList[cookieIndex - 1])
      // console.log('等待30秒...')
      // await wait(30000)
      // await getTask()
      // return
      if (unfinishedTasklist.length !== 0) {
        console.log(`\n=== 当前未完成任务 ===`)
        for (let item of unfinishedTasklist) {
          console.log(`\n-- ${item.name} --`)
          if (item.name == "签到") {
            await cwmSign()
            await getSignRecord()
          } else if (item.name == "阅读10分钟") {
            await getShelf()
            await getBookList(shelfList[cookieIndex - 1])
            console.log(`\n即将阅读...`)
            await cwmRead()
          } else if (item.name == "分享一个插画区帖子") {
            await get_bbs()
            console.log(`\n即将分享...`)
            await share_bbs()
          } else if (item.name == "每天点赞5个插画区帖子") {
            let unfinishedCount = item.total_count - item.complete_count
            console.log(`未完成次数${unfinishedCount}`)
            for (let i = 0; i < unfinishedCount; i++) {
              console.log(`\n点赞第${i + 1}次`)
              if (bbsList.length == 0) await get_bbs()
              await like_bbs()
            }
          } else if (item.name == "浏览插画区5分钟") {
            await bbsRead()
          }
        }
      }
      if (scrollChest.length !== 0) {
        console.log(`\n当前有${scrollChest.length}个滚动宝箱`)
        console.log(`\n第一个滚动宝箱：\n书名：${scrollChest[0].book_name}\nid：${scrollChest[0].chest_id}\n开始据此查找宝箱...`)
        chestId = scrollChest[0].chest_id
        await chestTask(cookieIndex)
      } else {
        if (isGetChest == "true") {
          console.log(`\n当前没有滚动宝箱\n查找宝箱开启，即将查找...`)
          await getChestId()
          await chestTask(cookieIndex)
        } else if (isGetChest == "false") {
          console.log(`\n当前没有滚动宝箱\n查找宝箱未开启，跳出！`)
        }
      }
    } catch (e) {
      console.log(e)
    } finally {
      if (unfinishedTasklist.length !== 0) await getTask()
      cookieIndex++
    }
  }
})().catch(e => {
  console.log(e.stack)
}).finally(() => {
  console.log(`\n[刺猬猫阅读], 结束!`)
})

async function chestTask(cookieIndex) {
  let chestList = await getChest()
  if (chestList.length == 0) {
    console.log(`未找到宝箱`)
    return
  }
  console.log(`\n找到${chestList.length}个宝箱，即将开宝箱...`)
  for (let i = 0; i < chestList.length; i++) {
    let item = chestList[i]
    console.log(`\n${item.book_name}，开始开宝箱...`)
    let openChestRes = await openChest(item.chest_id)
    if (
      openChestRes == "该宝箱已失效" ||
      openChestRes == "您已开启过该宝箱哦！"
    )
      continue
    if (item.is_inshelf == "0") {
      console.log(`${item.book_name}未加入书架，开始加入书架...`)
      if (shelfList.length == 0) await getShelf()
      let addBookRes = await addBook(
        item.book_id,
        shelfList[cookieIndex - 1]
      )
      if (addBookRes.code == "220005") {
        console.log(`检测到书架已满，跳出！`)
        break
      }
      await openChest(item.chest_id)
    }
    console.log(`开箱完成，即将删除此书...`)
    await delBook(item.book_id, shelfList[cookieIndex - 1])
  }
}

// 任务列表
async function getTask() {
  console.log(`\n==== 每日任务列表 ====`)
  try {
    let res = await taskPost({
      url: "task/get_all_task_list",
      data: {},
    })
    // console.log(JSON.stringify(res))
    if (res.code == "100000") {
      let tasklist = res.data.daily_task_list
      weekTaskList = res.data.week_task_info
      weekChest = res.data.week_task_info.chest_info_map
      challengeTask = res.data.challenge_task_info
      finishedTasklist = tasklist.filter((item) => item.is_finished === "1")
      unfinishedTasklist = tasklist.filter((item) => item.is_finished !== "1")
      for (let item of tasklist) {
        console.log(
          `${item.name} -- ${item.is_finished === "1" ? "已完成" : "未完成"}`
        )
      }
    } else if (res.code == "200001") {
      console.log("\ncookie填写错误或失效")
    } else {
      console.log("\n❌未知错误")
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

// 用户信息
async function cwmGetInfo() {
  let userInfo
  try {
    let res = await taskPost({
      url: "reader/get_my_info",
      data: {
        // reader_id: '4439430'
      },
    })
    if (res.code == "100000") {
      let { reader_info, prop_info } = res.data
      readerList.push(reader_info.reader_id)
      userInfo = {
        username: reader_info.reader_name,
        phone: reader_info.phone_num,
        //欢乐币/猫饼干
        restHlb: prop_info.rest_hlb,
        //代币
        restDb: prop_info.rest_gift_hlb,
        //推荐票
        restRecommend: prop_info.rest_recommend,
      }
    } else if (res.code == "200100") {
      console.log("cookie填写错误或失效")
    } else {
      console.log(res.tip || "❌未知错误")
    }
  } catch (e) {
    console.log(e)
  } finally {
    return userInfo
  }
}

// 签到
async function cwmSign() {
  try {
    let res = await taskPost({
      url: "reader/get_task_bonus_with_sign_recommend",
      data: {
        task_type: 1,
      },
    })
    if (res.code == "100000") {
      let {
        data: { bonus },
      } = res
      console.log(`✅签到成功~\n奖励：${bonus.exp}经验，${bonus.hlb}猫饼干`)
    } else if (res.code == "340001") {
      console.log(`您今天已经签过到啦~`)
    } else if (res.code == "200001") {
      console.log("cookie填写错误或失效")
    } else {
      console.log("❌未知错误")
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

// 签到记录
async function getSignRecord() {
  try {
    let res = await taskPost({
      url: "task/get_sign_record",
      data: {},
    })
    // console.log(JSON.stringify(res))
    if (res.code == "100000") {
      let { sign_record_list } = res.data
      let signedList = sign_record_list.filter((item) => item.is_signed == "1")
      console.log(`本周已连续签到${signedList.length}天`)
    } else {
      console.log(`${res.tip}`)
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

// 获取书架信息
async function getShelf() {
  try {
    let res = await taskPost({
      url: "bookshelf/get_shelf_list",
      data: {},
    })
    // console.log(JSON.stringify(res))
    if (res.code == "100000") {
      let {
        data: {
          shelf_list: [shelf],
        },
        scroll_chests,
      } = res
      console.log(
        `✅书架信息获取成功~\n书架id：${shelf.shelf_id}\n书架名：${shelf.shelf_name}`
      )
      shelfList.push(shelf.shelf_id)
      scrollChest = scroll_chests
    } else if (res.code == "200001") {
      console.log("\ncookie填写错误或失效")
    } else {
      console.log("\n❌未知错误")
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

// 获取小说信息
async function getBookList(shelf_id) {
  try {
    let res = await taskPost({
      url: "bookshelf/get_shelf_book_list_new",
      data: {
        count: "10",
        direction: "prev",
        order: "last_read_time",
        page: 0,
        shelf_id,
      },
    })
    // console.log(JSON.stringify(res))
    if (res.code == "100000") {
      let {
        data: { book_list },
      } = res
      console.log(`✅小说信息获取成功~\n共获取${book_list.length}本小说`)
      bookList = book_list
    } else if (res.code == "200001") {
      console.log("\ncookie填写错误或失效")
    } else {
      console.log("\n❌未知错误")
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

// 阅读
async function cwmRead() {
  try {
    let bookRandom = Math.floor(Math.random() * 10)
    let { book_info, last_read_chapter_id, last_read_chapter_title } =
      bookList[bookRandom]
    let { book_id, book_name } = book_info
    console.log(`阅读小说：${book_name}\n阅读章节：${last_read_chapter_title}`)
    let res = await taskPost({
      url: "reader/add_readbook",
      data: {
        readTimes,
        getTime: getNowFormatDate(),
        book_id,
        chapter_id: last_read_chapter_id,
      },
    })
    // console.log(JSON.stringify(res))
    if (res.code == "100000") {
      // console.log(res)
      console.log(`✅阅读记录成功~`)
    } else if (res.code == "200001") {
      console.log("cookie填写错误或失效")
    } else {
      console.log("❌未知错误")
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

// 书加书架
async function addBook(book_id, shelf_id) {
  let addBookRes
  try {
    res = await taskPost({
      url: "bookshelf/favor",
      data: {
        book_id,
        shelf_id,
      },
    })
    addBookRes = res
    // console.log(res)
    if (res.code == "100000") {
      console.log(`✅加书架成功~`)
    } else if (res.code == "220004") {
      console.log(`${res.tip}`)
    } else if (res.code == "220005") {
      console.log(`${res.tip}`)
    } else if (res.code == "200001") {
      console.log("cookie填写错误或失效")
    } else {
      console.log("❌未知错误")
    }
  } catch (e) {
    console.log(e)
  } finally {
    return addBookRes
  }
}

// 删除书
async function delBook(book_id, shelf_id) {
  let delBookRes
  try {
    res = await taskPost({
      url: "bookshelf/delete_shelf_book",
      data: {
        book_id,
        shelf_id,
      },
    })
    delBookRes = res
    // console.log(res)
    if (res.code == "100000") {
      console.log(`✅删除成功~`)
    } else {
      console.log(`${res.tip}`)
    }
  } catch (e) {
    console.log(e)
  } finally {
    return delBookRes
  }
}

// 获取宝箱id
async function getChestId() {
  try {
    let res = await taskPost({
      url: "reader/get_message_sys_list_by_type?count=10&message_type=3&page=0",
      data: {},
    })
    // console.log(JSON.stringify(res))
    if (res.code == "100000") {
      let { message_sys_list } = res.data
      chestId = message_sys_list[0].chest_id
      message_sys_list.forEach(item => {
        chestId = item.chestId > chestId ? item.chestId : chestId
      })
      chestId = chestId - chestNum + 5
    } else {
      console.log(`${res.tip}`)
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

// 找宝箱
async function getChest(chest_id, chest_num = chestNum) {
  let chestList = []
  chest_id = chest_id ? chest_id : Number(chestId)
  try {
    for (let i = 0; i < Number(chest_num); i++) {
      console.log(`\n-- 宝箱${i + 1} --`)
      let res = await taskPost({
        url: "chest/get_chest_detail",
        data: {
          chest_id,
          count: "20",
          page: "1",
          module: "ouhuang",
        },
      })
      // console.log(res)
      if (res.code == "100000") {
        let {
          data: {
            chest_info: { book_info },
          },
        } = res
        console.log(
          `✅宝箱信息获取成功~\n宝箱书籍id：${book_info.book_id}\n宝箱书名：${book_info.book_name}`
        )
        book_info = {
          ...book_info,
          chest_id,
        }
        chestList.push(book_info)
      } else if (res.code == "200001") {
        console.log("cookie填写错误或失效")
      } else if (res.code == "220002") {
        console.log(`${res.tip}`)
      } else if (res.code == "310000" && res.tip == "该宝箱不存在") {
        console.log(`${res.tip}`)
        console.log(`不存在宝箱id：${chest_id}`)
        break
      } else {
        console.log("❌未知错误")
      }
      if (i == chestNum - 1)
        console.log(`已找到最后一个宝箱，当前宝箱id：${chest_id}`)
      chest_id++
    }
  } catch (e) {
    console.log(e)
  } finally {
    return chestList
  }
}

// 开宝箱
async function openChest(chest_id) {
  console.log(`开宝箱中...`)
  let openChestRes = ""
  try {
    let res = await taskPost({
      url: "chest/open_chest",
      data: {
        chest_id,
      },
    })
    // console.log(res)
    if (res.code == "100000") {
      console.log(
        `✅开宝箱成功~\n获得${res.data.item_name}${res.data.item_num}`
      )
    } else {
      openChestRes = res.tip
      console.log(`${res.tip}`)
    }
  } catch (e) {
    console.log(e)
  } finally {
    return openChestRes
  }
}

// 获取插画区列表
async function get_bbs(bbs_id) {
  try {
    let res = await taskPost({
      url: "bbs/get_bbs_list",
      data: {
        bbs_type: 5,
      },
    })
    // console.log(JSON.stringify(res))
    if (res.code == "100000") {
      let {
        data: { bbs_list },
      } = res
      bbsList = bbs_list
      console.log(`✅插画信息获取成功~\n共${bbs_list.length}条插画信息`)
    } else {
      console.log(`${res.tip}`)
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

// 分享插画区帖子
async function share_bbs() {
  // console.log(``)
  let bbsRandom = Math.floor(Math.random() * 10)
  let { bbs_id, bbs_title } = bbsList[bbsRandom]
  try {
    let res = await taskPost({
      url: "bbs/share_bbs",
      data: {
        bbs_id,
      },
    })
    if (res.code == "100000") {
      console.log(`${bbs_title} -- 分享成功`)
    } else {
      console.log(`${res.tip}`)
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

// 点赞5个插画区帖子
async function like_bbs() {
  try {
    let bbsRandom = Math.floor(Math.random() * 10)
    let { bbs_id, bbs_title } = bbsList[bbsRandom]
    console.log(`${bbs_title}`)
    await unlike_bbs(bbs_id)
    let res = await taskPost({
      url: "bbs/like_bbs",
      data: {
        bbs_id,
      },
    })
    if (res.code == "100000") {
      console.log(`点赞成功~`)
    } else {
      console.log(`${res.tip}`)
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

// 取消点赞插画区帖子
async function unlike_bbs(bbs_id) {
  try {
    let res = await taskPost({
      url: "bbs/unlike_bbs",
      data: {
        bbs_id,
      },
    })
    if (res.code == "100000") {
      console.log(`取消成功~`)
    } else {
      console.log(`${res.tip}`)
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

// 浏览插画区5min
async function bbsRead() {
  try {
    let res = await taskPost({
      url: "bbs/add_bbs_read_time",
      data: {
        readTimes: 300,
        getTime: getNowFormatDate(),
      },
    })
    if (res.code == "100000") {
      console.log(`✅浏览记录成功`)
    } else {
      console.log(`${res.tip}`)
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

async function getMeta() {
  try {
    let res = await taskPost({
      url: "meta/get_meta_data",
      data: {},
    })
    console.log(JSON.stringify(res))
    if (res.code == "100000") {
      // console.log(`${bbs_title} -- 点赞成功`)
    } else {
      console.log(`${res.tip}`)
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

async function get_carousel(reader_id) {
  try {
    let orderNo = {
      reader_id,
      sub_type: '2',
      os_type: '1',
      src_type: '1',  
      timestamp: Date.now()
    }
    let res = await taskPost({
      url: "reader/record_ad_order",
      data: {
        ad_type: 2,
        orderNo: encrypt(orderNo),
        src_type: orderNo.src_type,
        sub_type: orderNo.sub_type, //开的宝箱顺序
      },
    })
    console.log(JSON.stringify(res))
    if (res.code == "100000") {
      // console.log(`${bbs_title} -- 点赞成功`)
    } else {
      console.log(`${res.tip}`)
    }
  } catch (e) {
    console.log(e)
  } finally {
    return
  }
}

function taskPost(options) {
  let [login_token, account, device_token] = cookie.split("&")

  let data = {
    ...options.data,
    app_version: "3.0.805",
    device_token,
    login_token,
    account,
  }
  return new Promise((resolve) => {
    axios({
      url: `https://app.hbooker.com/${options.url}`,
      method: "post",
      data: toUrlencoded(data),
      headers: {
        "user-agent": `Android  com.kuangxiangciweimao.novel  ${data.app_version},Xiaomi, Mi 12,31, 12`,
      },
    }).then((response) => {
      let res = decrypt(response.data)
      resolve(JSON.parse(res))
    })
  })
}

function getNowFormatDate() {
  let date = new Date()
  let year = date.getFullYear()
  let month = date.getMonth() + 1
  let aDate = date.getDate()
  let hour = date.getHours()
  let min = date.getMinutes()
  let sec = date.getSeconds()
  if (month >= 1 && month <= 9) {
    month = "0" + month
  }
  if (aDate >= 1 && aDate <= 9) {
    aDate = "0" + aDate
  }
  if (hour >= 0 && hour <= 9) {
    hour = "0" + hour
  }
  if (min >= 0 && min <= 9) {
    min = "0" + min
  }
  if (sec >= 0 && sec <= 9) {
    sec = "0" + sec
  }
  let currentDate = `${year}-${month}-${aDate} ${hour}:${min}:${sec}`
  return currentDate
}

function decrypt(data) {
  let iv = CryptoJS.enc.Hex.parse("00000000000000000000000000000000")
  let key = CryptoJS.SHA256("zG2nSeEfSHfvTCHy5LCcqtBbQehKNLXn")
  let decrypted = CryptoJS.AES.decrypt(data, key, {
    mode: CryptoJS.mode.CBC,
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
  })
  return decrypted.toString(CryptoJS.enc.Utf8)
}

function encrypt(data) {
  return CryptoJS.MD5(JSON.stringify(data)).toString()
}

function toUrlencoded(data) {
  let tempArr = []
  for (let i in data) {
    let key = encodeURIComponent(i)
    let value = encodeURIComponent(data[i])
    tempArr.push(key + "=" + value)
  }
  let urlencoded = tempArr.join("&")
  return urlencoded
}

function wait(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

async function envFormat() {
  cwmCookie = cwmCookie || process.env[envName]
  if (cwmCookie) {
    if (cwmCookie.indexOf("@") === -1) {
      cookieArr.push(cwmCookie)
    } else {
      cwmCookie.split("@").forEach((item) => {
        cookieArr.push(item)
      })
    }
    return true
  } else {
    console.log(`\n未填写变量${envName}`)
    return
  }
}
