const createError = require('http-errors')

const Stream = require('../models/stream').model
const Generation = require('../models/generation').model

const create = async ({ name, generation, title, url, muxData, endDate, isActive, isLive }) => {
  const generationFound = await Generation.findOne({ type: generation.type, number: generation.number })
  if (!generationFound) throw createError(409, `Generation [${generation.type}, ${generation.number}] does not exists`)

  const newStream = new Stream({ name, generation: generationFound._id, title, url, muxData, endDate, isActive, isLive })
  const error = newStream.validateSync()
  if (error) throw error

  const existingStream = await Stream.findOne({ name }).exec()
  if (existingStream) throw createError(409, `Stream [${name}] already exists`)

  return newStream.save()
}

const getAll = () => Stream.find({}).exec()

module.exports = {
  getAll,
  create
}
