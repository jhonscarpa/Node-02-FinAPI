const express = require('express')
const { v4: uuidv4 } = require('uuid')

const app = express()

app.use(express.json())

const customers = []

function verifyIfExistsAccount(request, response, next) {
  const { cpf } = request.headers
  const customer = customers.find(customer => customer.cpf === cpf)
  if (!customer) {
    return response
      .status(400)
      .json({ error: true, message: 'Usuário não encontrado' })
  }
  request.customer = customer
  return next()
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit') {
      return acc + operation.amount
    } else {
      return acc - operation.amount
    }
  }, 0)
  return balance
}

app.post('/account', (request, response) => {
  const { cpf, name } = request.body

  const customerAlreadyExists = customers.some(customer => customer.cpf === cpf)

  if (customerAlreadyExists) {
    return response
      .status(400)
      .json({ error: true, message: 'CPF ja cadastrado' })
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  })

  return response.status(201).send()
})

app.get('/statement', verifyIfExistsAccount, (request, response) => {
  const { customer } = request
  const balance = getBalance(customer.statement)
  return response.json({ statement: customer.statement, total: balance })
})

app.post('/deposit', verifyIfExistsAccount, (request, response) => {
  const { description, amount } = request.body
  const { customer } = request
  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit',
  }
  const balance = getBalance(customer.statement) + amount

  customer.statement.push(statementOperation)
  return response
    .status(201)
    .json({ operation: statementOperation, total: balance })
})

app.post('/withdraw', verifyIfExistsAccount, (request, response) => {
  const { amount } = request.body
  const { customer } = request
  const balance = getBalance(customer.statement)

  if (balance < amount) {
    return response
      .status(400)
      .json({ error: true, message: 'Saldo insuficiente' })
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit',
  }
  customer.statement.push(statementOperation)

  return response
    .status(201)
    .json({ operation: statementOperation, total: balance })
})

app.get('/statement/date', verifyIfExistsAccount, (request, response) => {
  const { customer } = request
  const { date } = request.query

  const dataFormat = new Date(date + ' 00:00')

  const statement = customer.statement.filter(
    statement =>
      statement.created_at.toDateString() ===
      new Date(dataFormat).toDateString(),
  )

  const balance = getBalance(statement)
  return response.json({ statement: statement, total: balance })
})

app.put('/account', verifyIfExistsAccount, (request, response) => {
  const { name } = request.body
  const { customer } = request
  customer.name = name

  return response
    .status(201)
    .json({ customer, message: 'Usuário atualizado com sucesso' })
})

app.get('/account', verifyIfExistsAccount, (request, response) => {
  const { customer } = request

  return response.json(customer)
})

app.delete('/account', verifyIfExistsAccount, (request, response) => {
  const { customer } = request

  customers.splice(customer, 1)

  return response.status(200).json(customers)
})

app.get('/balance', verifyIfExistsAccount, (request, response) => {
  const { customer } = request

  const filterWithDraw = customer.statement.filter(
    statement => statement.type === 'debit',
  )

  const filterdDeposit = customer.statement.filter(
    statement => statement.type === 'credit',
  )

  const balanceTotal = getBalance(customer.statement)
  const balanceWithDraw = getBalance(filterWithDraw)
  const balanceDeposit = getBalance(filterdDeposit)

  return response.status(201).json({
    total: balanceTotal,
    debit: balanceWithDraw,
    deposit: balanceDeposit,
  })
})

app.listen(8080)
console.log('Server started on port 8080 🚀')
