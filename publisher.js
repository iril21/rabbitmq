const amqp = require('amqplib')
const fs = require('fs')

const exchange = 'exchange'
const args = process.argv.slice(2)
const bindingKey = (args.length > 0) ? args[0] : 'feuilleDeGarde'
const nombreTotalFeuillesDeGarde = (args.length > 0 && args[1]) ? args[1] : 7000
const modeEnvoiMessage = (args.length > 0 && args[2]) ? args[2] : 'mono'
const nombreFeuillesDeGardeParMessage = (args.length > 0 && args[3]) ? args[3] : 250

let connection
let channel

async function send() {
    try {
        connection = await amqp.connect('amqp://localhost')
    } catch (error) {
        console.error(`Failed to connect (${error.message})`)
        return
    }

    try {
        channel = await connection.createConfirmChannel()
    } catch (error) {
        console.error(`Failed to create a channel (${error.message})`)
        return
    }

    await channel.assertExchange(exchange, 'direct', {
        durable: true
    })

    await publish()

    setTimeout(() => {
        connection.close()
        process.exit(0)
    }, 600000)
}

async function publish() {
    let msg
    try {
        msg = fs.readFileSync(`${__dirname}/data/feuille-de-garde.json`)
    } catch (_err) {
        msg = 'Hello World!'
    }
    let messages = msg.toString()
    let nombreTotalMessagesEnvoyes = 0
    for (let i = 1; i <= nombreTotalFeuillesDeGarde; i++) {
        messages = messages.concat(`, ${msg}`)
        if (modeEnvoiMessage === 'multi' && i % nombreFeuillesDeGardeParMessage === 0) {
            nombreTotalMessagesEnvoyes++
            const buffer = Buffer.from(messages)
            try {
                await channel.publish(exchange, bindingKey, buffer, { persistent: true })
                console.log(" Sent to %s %s: message size %s bytes", i, bindingKey, Buffer.byteLength(buffer))
                messages = ''
            } catch (error) {
                console.error(`Failed to publish message (${error.message})`)
            }
        }
    }

    if (modeEnvoiMessage === 'mono') {
        const buffer = Buffer.from(messages)
        try {
            await channel.publish(exchange, bindingKey, buffer, { persistent: true, mandatory: true })
            console.log(" Sent to %s: message size %s bytes", bindingKey, Buffer.byteLength(buffer))
            nombreTotalMessagesEnvoyes++
        } catch (error) {
            console.error(`Failed to publish message (${error.message})`)
        }
    }
    console.log(`nombre total de messages envoyés ${nombreTotalMessagesEnvoyes}`)
}

send()


