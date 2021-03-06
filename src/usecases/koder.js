const createError = require('http-errors')
const _ = require('lodash')

const bcrypt = require('../lib/bcrypt')
const utils = require('../lib/utils')
const Koder = require('../models/koder').model
const Generation = require('../models/generation').model

async function create ({ firstName = '', lastName = '', email = '', password = '', phone = '', generation = {} }) {
  const hash = await bcrypt.hash(password)

  const generationFound = await Generation.findOne({ type: generation.type, number: generation.number })
  if (!generationFound) throw createError(409, `Generation [${generation.type}, ${generation.number}] does not exists`)

  const newKoder = new Koder({ firstName, lastName, email, password: hash, phone, generation: generationFound._id })

  const error = newKoder.validateSync()
  if (error) throw error

  const existingKoder = await Koder.findOne({ email }).exec()
  if (existingKoder) throw createError(409, `Koder [${email}] already exists`)

  return newKoder.save()
}

async function upsertMany (koders = []) {
  const kodersHashesPromises = koders.map(({ password }) => bcrypt.hash(password))
  const kodersHashes = await Promise.all(kodersHashesPromises)

  const kodersGenerationsPromises = koders.map(koder => {
    return Generation.findOne({
      number: koder.generation.number,
      type: koder.generation.type
    })
  })
  const kodersGenerations = await Promise.all(kodersGenerationsPromises)

  const kodersToUpsert = koders.map((koderData, index) => {
    return {
      ...koderData,
      password: _.get(kodersHashes, index),
      generation: _.get(kodersGenerations, `${index}._id`)
    }
  })

  const upsertKodersPromises = kodersToUpsert.map(koder => {
    const koderData = utils.removeFalsyEntries(koder)
    return Koder.findOneAndUpdate(
      { email: koder.email },
      { ...koderData },
      { upsert: true }
    )
  })

  return Promise.all(upsertKodersPromises)
  // return Koder.insertMany(kodersToUpsert) // upsert
}

async function resetPassword (email = '', password = '') {
  const hash = await bcrypt.hash(password)
  const koder = await Koder.findOne({ email })
  if (!koder) throw createError(404, `Koder [${email}] does not exists`)

  koder.password = hash
  return koder.save()
}

async function getAll (selectOptions = '') {
  return Koder.find({})
    .sort({ email: 'asc' })
    .select(selectOptions)
    .populate('generation')
}

async function sigIn (email = '', password = '') {
  const koder = await Koder.findOne({ email }).select('+password')

  if (!koder) throw createError(401, 'Invalid data')

  const { password: hash } = koder
  const isValidPassword = await bcrypt.compare(password, hash)
  if (!isValidPassword) throw createError(401, 'Invalid data')
  return koder
}

function getById (id, selectOptions = '') {
  return Koder.findById(id)
    .select(selectOptions)
    .populate('generation')
}

module.exports = {
  create,
  upsertMany,
  getAll,
  sigIn,
  resetPassword,
  getById
}
