# Installation

- docker run -d -p 15672:15672 -p 5672:5672 --name rabbitmq rabbitmq:3-management : permet de lancer le serveur rabbitMq sur le port 5672, le plugin management est activé automatiquement est accessible sur le port 15672 on peut s'y connecter via user: guest, mot de passe: guest

- Pour lancer le publisher:
  **yarn publisher [QueueBindingTag] [nombreTotalDeFeuillesDeGarde] [modeEnvoiFeuillesDeGarde] [nombreFeuillesDeGardeParMessage (si mode multi)]**

  QueueBindingTag: tag de la queue vers laquelle le message va être envoyé (exchange mode direct)
  nombreTotalDeFeuillesDeGarde: le script lit un fichier json de feuille de garde prévisionnelle et duplique le message lu nombreTotalDeFeuillesDeGarde fois pour simuler l'envoie de plusieurs feuilles de garde. (7000 feuilles de garde ~ 126MB)
  modeEnvoiFeuillesDeGarde: prend comme valeur mono ou multi pour envoyer toutes les feuilles de garde en un seul message ou plusieurs
  nombreFeuillesDeGardeParMessage: nombre de feuilles de garde envoyées par message si jamais le modeEnvoiFeuillesDeGarde est multi

- pour lanceer le consommateur:
  **yarn consumer [queueName] [QueueBindingTag]**

  queueName: nom de la queue à la quelle le consommateur s'abonne et crée si jamais elle n'est pas créée
  QueueBindingTag: tag de la queue vers laquelle le message va être envoyé (exchange mode direct)

# Gestion des incidents

## si le broker est KO:
    * S'assurer que les exchanges sont durables
    * S'assurer que les queues sont durables
    * Les messages sont persistants
    * Le publisher doit activer ack des messages envoyés + implémentation d'un mécanisme de renvoi de messages
    * Penser à la reconnexion automatique des consommateurs au broker

## Si le consommateur est KO:
    * Faire attention au TTL et max-length de la queue
    * Faire attention au timeout global ack du broker
    * S'assurer de l'idempotence du traitement du message si jamais on le rejoue

## Si le publisher est KO:
    * On continue à fonctionner avec des données non à jour ?

# Best practices

- Privilégier les queues courtes :
    * si le broker redémarre besoin d'indexer les messages
    * Si la RAM est pleine le broker transfert les messages sur le disque ce qui peut bloquer la queue
    * Vaut mieux définir les paramètres de la queue pour limiter ses ressources: 
      TTL: le temps de survie d'un message dans la queue
      max-length: longeur de la queue
    * une queue est mono-thread et peut traiter approximativement 50000 messages

- utiliser lazy queues:
    - les messages sont stockés directement sur le disque, ça évite le transfert des messages de la RAM vers le disque (si la RAM est pleine) et donc le blocage de la queue
    - Ne pas les utiliser si la queue est courte


- Taille du message:
    - C'est toujours mieux de privilégier des messages longs au lieu de les découper en petits messages avant de les envoyer cependant si le consommateur échoue il va falloir retraiter l'intégralité du message tandis que en petit message il faut traiter que ceux qui échouent sachant que la taille maximale d'un message est de 128MB en RabbitMQ >= 3.8.0

- message ack:
    - Faut toujours activer ack côté publisher ça évite la perte des messages lors de l'envoi vers le broker
    - Les messages non acquittés consomment la RAM du serveur. Le ack manuel permet d'éviter de perdre le message si son traitement ne s'est pas bien déroulé (le message est toujours présent dans la queue) mais moins performant par rapport à l'ack automatique
    - Si le consommateur n'est pas en capacité de traiter le message faut le rejeter pour le reprgrammer dans la file et traité par un autre consommateur

- Définir le **Channel Prefetch Count**: nombre max de messages non acquittés permis sur un canal, ça peut-être défini pour les consommateurs du canal. le prefetch count optimal prend en considération le nombre de messages qui transitent sur le canal et le nombre de consomateurs du canal



# Reste à creuser:

- Mécanisme de reconnexion automatique du consommateur si jamais il est déconnecté (pas réussi à faire marcher la lib amqplib-auto-recovery)

- Qu'est ce qui se passe si la taille du message dépasse la taille maximale autorisée par rabbitMq (128MB) ?

- Une perte de messages est constatée avec un test de >20000 feuilles de gardes avec des messages de 250 feuilles de garde lorsque ferme la connection du publisher directement après la fin du dernier publish sans avoir d'exceptions ni d'erreur dans les logs du broker et pas visibles sur l'ui management ? En augmentant le délai de fermeture de la connection du publisher ça résout le problème


- Architecture des queues :
    * une queue ou plusieurs queues par type de messages
    * une queue gère plusieurs types de messages ?
    * un exchange qui gère toutes les queues ou plusieurs exchanges ?
    * un canal par queue ou gèrent plusieurs queues ?

- paramétrage des queues/canaux :
    * type de queue : lazy ? durable ? exclusive ?
    * TTL ? max-length ?
    * prefetch count des canaux ?

- paramétrage global du broker:
    - Capacité disque/ RAM
    - Nombre de noeuds
    - Gestion des logs
    - Gestion des alertes
    - Sécurité des connexion et chiffrement de la data qui transite
    - Gestion de l'ui management du broker
