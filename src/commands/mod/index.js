import dude from 'debug-dude'
const { /*debug, log,*/ info /*, warn, error*/ } = dude('bot:commands:mod')

import { sendToAll, sendToUser, sendToMods } from '../../index'
import {
  cursive, htmlMessage,
  modInfoText, getUsername
} from '../../messages'
import { getFromCache, getCacheGroup } from '../../cache'
import {
  getUserByUsername, getUser, getUsers,
  warnUser, kickUser, banUser
} from '../../db'
import { RANKS } from '../../ranks'

const getReason = (evt) =>
  evt.args.length > 0
  ? ' (' + evt.args.join(' ') + ')'
  : ''

const ERR_NO_REPLY = 'please reply to a message to use this command'

export default function modCommands (user, evt, reply) {
  let messageRepliedTo

  switch (evt.cmd) {
    case 'modsay':
      if (evt.args.length <= 0) return reply(cursive('please specify a message, e.g. /modsay message'))
      info('%o sent mod message -> %s', user, evt.args.join(' '))
      sendToAll(htmlMessage(evt.args.join(' ') + ' <b>~mods</b>'))
      break

    case 'info':
      if (evt && evt.raw && evt.raw.reply_to_message) {
        messageRepliedTo = getFromCache(evt, reply)
        if (messageRepliedTo) {
          const user = getUser(messageRepliedTo.sender)
          reply(htmlMessage(
            modInfoText(user)
          ))
        }
      }
      break

    case 'delete':
      messageRepliedTo = getFromCache(evt, reply)
      let replyCache = getCacheGroup(evt && evt.raw && evt.raw.reply_to_message && evt.raw.reply_to_message.message_id)

      if (messageRepliedTo) {
        // for everyone who is not a mod or higher, or not the sender, edit the message this is referencing.
        info('%o deleted message of user %o', user, getUser(messageRepliedTo.sender))
        getUsers().map((user) => {
          if (user.rank < RANKS.mod && messageRepliedTo.sender !== user.id) {
            reply({
              type: 'editMessageText',
              chat: user.id,
              id: replyCache && replyCache[user.id],
              text: '<i>this message disappeared into the ether</i>',
              options: {
                parse_mode: 'HTML'
              }
            })
          }
        })
        sendToUser(messageRepliedTo.sender, {
          ...htmlMessage('<i>this message has now been deleted, only you can see the content of the above message</i>'),
          options: {
            reply_to_message_id: evt && evt.raw && evt.raw.reply_to_message && evt.raw.reply_to_message.message_id,
            parse_mode: 'HTML'
          }
        })
        sendToMods({
          ...htmlMessage(getUsername(user) + '<i> deleted the above message</i>'),
          options: {
            reply_to_message_id: replyCache && replyCache[user.id],
            parse_mode: 'HTML'
          }
        })
      } else {
        reply(cursive(ERR_NO_REPLY))
      }
      break

    case 'warn':
      messageRepliedTo = getFromCache(evt, reply)
      if (messageRepliedTo) {
        const warnResult = warnUser(messageRepliedTo.sender)
        info('%o warned user %s -> %o', user, messageRepliedTo.sender, warnResult)
        sendToUser(messageRepliedTo.sender, {
          ...htmlMessage('<i>you\'ve been warned' + getReason(evt) + ', use</i> /info <i>to check your warnings</i>'),
          options: {
            reply_to_message_id: evt.raw.reply_to_message.message_id,
            parse_mode: 'HTML'
          }
        })
        sendToMods({
          ...htmlMessage(getUsername(user) + ' <i>warned user' + getReason(evt) + ', has</i> <b>' + warnResult.warnings + '</b> <i>warnings now</i>'),
          options: {
            reply_to_message_id: evt.raw.reply_to_message.message_id,
            parse_mode: 'HTML'
          }
        })
      } else {
        reply(cursive(ERR_NO_REPLY))
      }
      break

    case 'kick':
      messageRepliedTo = getFromCache(evt, reply)
      if (messageRepliedTo) {
        const kickResult = warnUser(messageRepliedTo.sender)
        kickUser(messageRepliedTo.sender)
        info('%o kicked user %s -> %o', user, messageRepliedTo.sender, kickResult)
        sendToUser(messageRepliedTo.sender, {
          ...htmlMessage('<i>you\'ve been kicked' + getReason(evt) + ', use</i> /start <i>to rejoin</i>'),
          options: {
            reply_to_message_id: evt.raw.reply_to_message.message_id,
            parse_mode: 'HTML'
          }
        })
        sendToMods({
          ...htmlMessage(getUsername(user) + ' <i>kicked user' + getReason(evt) + ', has</i> <b>' + kickResult.warnings + '</b> <i>warnings now</i>'),
          options: {
            reply_to_message_id: evt.raw.reply_to_message.message_id,
            parse_mode: 'HTML'
          }
        })
      } else {
        reply(cursive(ERR_NO_REPLY))
      }
      break

    case 'ban':
      messageRepliedTo = getFromCache(evt, reply)
      if (messageRepliedTo) {
        const repliedToUser = getUser(messageRepliedTo.sender)
        // if (repliedToUser.rank >= RANKS.user) return reply(cursive('you can\'t ban mods or admins'))

        const banResult = warnUser(messageRepliedTo.sender)
        kickUser(messageRepliedTo.sender)
        banUser(messageRepliedTo.sender)
        info('%o banned user %s -> %o', user, messageRepliedTo.sender, banResult)
        sendToUser(messageRepliedTo.sender, {
          ...htmlMessage('<i>you\'ve been banned' + getReason(evt) + '</i>'),
          options: {
            reply_to_message_id: evt.raw.reply_to_message.message_id,
            parse_mode: 'HTML'
          }
        })
        sendToMods({
          ...htmlMessage(getUsername(user) + ' <i>banned user' + getReason(evt) + ', has</i> <b>' + banResult.warnings + '</b> <i>warnings now</i>'),
          options: {
            reply_to_message_id: evt.raw.reply_to_message.message_id,
            parse_mode: 'HTML'
          }
        })
      } else {
        reply(cursive(ERR_NO_REPLY))
      }
      break
  }
}
