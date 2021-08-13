const amqp = require('amqplib/callback_api')
const fs = require('fs')

amqp.connect('amqp://localhost', (error0, connection) => {
    if (error0) {
        console.error(`Failed to connect (${error0.message})`)
        return
    }
    connection.createConfirmChannel((error1, channel) => {
        if (error1) {
            console.error(`Failed to create a channel (${error1.message})`)
            return
        }
        const exchange = 'exchange'
        const args = process.argv.slice(2)
        const bindingKey = (args.length > 0) ? args[0] : 'feuilleDeGarde'
        const nombreTotalFeuillesDeGarde = (args.length > 0 && args[1]) ? args[1] : 7000
        const modeEnvoiMessage = (args.length > 0 && args[2]) ? args[2] : 'mono'
        const nombreFeuillesDeGardeParMessage = (args.length > 0 && args[3]) ? args[3] : 250

        channel.assertExchange(exchange, 'direct', {
            durable: true
        })
        let msg
        try {
            msg = fs.readFileSync(`${__dirname}/data/feuille-de-garde.json`)
        } catch (_err) {
            msg = 'Hello World!'
        }
        let messages = msg.toString()
        for (let i = 1; i <= nombreTotalFeuillesDeGarde; i++) {
            messages = messages.concat(`, ${msg}`)
            if (modeEnvoiMessage === 'multi' && i % nombreFeuillesDeGardeParMessage === 0) {
                const buffer = Buffer.from(messages)
                channel.publish(exchange, bindingKey, buffer, { persistent: true }, (err, _ok) => {
                    if (err)
                        console.log('Message nacked!')
                    else
                        console.log('Message acked')
                })
                console.log(" Sent to %s %s: message size %s bytes", i, bindingKey, Buffer.byteLength(buffer))
                messages = ''
            }
        }

        if (modeEnvoiMessage === 'mono') {
            const buffer = Buffer.from(messages)
            channel.publish(exchange, bindingKey, buffer, { persistent: true }, (err, _ok) => {
                if (err)
                    console.log('Message nacked!')
                else
                    console.log('Message acked')
            })
            console.log(" Sent to %s: message size %s bytes", bindingKey, Buffer.byteLength(buffer))
        }
    })
    setTimeout(() => {
        connection.close()
        process.exit(0)
    }, 500)
})

