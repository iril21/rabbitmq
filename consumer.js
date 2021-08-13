const amqp = require('amqplib/callback_api')
const fs = require('fs')

const args = process.argv.slice(2)

if (args.length === 0) {
    process.exit(1)
}

amqp.connect('amqp://localhost', (error0, connection) => {
    if (error0) {
        console.error(`Failed to connect (${error0.message})`);
        return
    }
    connection.createChannel((error1, channel) => {
        if (error1) {
            console.error(`Failed to create a channel (${error1.message})`)
            return
        }
        channel.prefetch(100)

        const exchange = 'exchange'
        const queueName = args[0]
        const bindingKey = args[1] || 'feuilleDeGarde'

        channel.assertExchange(exchange, 'direct', {
            durable: true
        })

        channel.assertQueue(queueName, {
            exclusive: false,
            durable: true,
            maxLength: 1000,
            messageTtl: 60000,
            queueMode: 'lazy'
        }, (error2, q) => {
            if (error2) {
                console.error(`Failed to create a queue (${error2.message})`);
                return
            }
            console.log('Waiting for messages. To exit press CTRL+C')
            channel.bindQueue(q.queue, exchange, bindingKey)

            let count = 0
            channel.consume(q.queue, (msg) => {
                console.log(" Received from %s", msg.fields.routingKey)
                setTimeout(() => {
                    fs.writeFile(`${__dirname}/data/feuille-de-garde-out-${Date.now()}.json`, msg.content.toString(), (err) => {
                        if (err)  console.log(err)
                        channel.ack(msg)
                    })
                    count++
                    console.log(count)
                }, 0)
            }, {
                noAck: false
            })
        })
    })
})