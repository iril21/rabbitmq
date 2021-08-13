const amqp = require('amqplib')
const fs = require('fs')

const args = process.argv.slice(2)
const exchange = 'exchange'
const queueName = args[0]
const bindingKey = args[1] || 'feuilleDeGarde'
let connection
let channel
let queue
let nombreTotalMessagesRecus = 0

if (args.length === 0) {
    process.exit(1)
}

async function receive() {
    try {
        connection = await amqp.connect('amqp://localhost')
    } catch (error) {
        console.error(`Failed to connect (${error.message})`)
        return
    }

    try {
        channel = await connection.createChannel()
    } catch (error) {
        console.error(`Failed to create a channel (${error.message})`)
        return
    }

    channel.prefetch(10000)

    channel.assertExchange(exchange, 'direct', {
        durable: true
    })

    try {
        queue = await channel.assertQueue(queueName, {
            exclusive: false,
            durable: true,
            maxLength: 1000,
            messageTtl: 60000,
            queueMode: 'lazy'
        })
    } catch (error) {
        console.error(`Failed to create a queue (${error.message})`)
        return
    }

    console.log('Waiting for messages. To exit press CTRL+C')
    channel.bindQueue(queue.queue, exchange, bindingKey)

    try {
        channel.consume(queue.queue, (msg) => {
            console.log(" Received from %s", msg.fields.routingKey)
                // fs.writeFile(`${__dirname}/data/feuille-de-garde-out-${Date.now()}.json`, msg.content.toString(), (err) => {
                //     if (err)  console.log(err)
                //     channel.ack(msg)
                // })
                channel.ack(msg)
                nombreTotalMessagesRecus++
                console.log(`nombre total de messages recus ${nombreTotalMessagesRecus}`)
        }, {
            noAck: false
        })
    } catch (error) {
        console.log(`couldn't consume ${error.message}`)
    }
}

receive()