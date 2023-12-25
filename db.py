from flask import Flask
from flask_pymongo import pymongo

# Connecting to mongo db collection with credentials
CONNECTION_STRING = 'mongodb+srv://developer1:developer1@communityengage-u9kuk.mongodb.net/Engage_userData_URL?retryWrites=true&w=majority'
client = pymongo.MongoClient(CONNECTION_STRING)
db = client.get_database('Engage_userData_URL')
user_collection = pymongo.collection.Collection(db, 'userData_URL')
