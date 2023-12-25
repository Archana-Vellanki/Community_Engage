from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import db
from datetime import datetime
from urllib import parse

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'


auth_users = {'mentors': ['archana.vellanki95@msitprogram.net', 'sample.1@msitprogram.net'], 'students': [
    'meghakenguru98@msitprogram.net', 'saripudiprasanna@msitprogram.net']}

tasks = {'archana.vellanki95@msitprogram.net': ['firstA', 'secondA'],
         'meghakenguru98@msitprogram.net': [], 'saripudiprasanna@msitprogram.net': ['firstS', 'SecondS', 'ThirdS']}


@app.route("/api/auth/", methods=["GET"])
@cross_origin()
def is_authorised():
    # to authorize a login attempt to be valid or not
    print("Checking authorisation")
    email = parse.unquote(request.args.get("email"))
    for eachList in list(auth_users.values()):
        if (email in eachList):
            user_data = []
            if (db.db.userData_URL.find({'_id': email}).count() == 0):
                db.db.userData_URL.insert(
                    {'_id': email, 'tasks': {}, 'msgs': {'sent': {}, 'rec': {}, 'unread': {}}})
            return jsonify(user_data), 200
    if (email.split('@')[1] != 'msitprogram.net'):
        return jsonify({"error": "Please login with MSIT account"}), 401
    else:
        return jsonify({"error": "This extension allows users from the class of 2021 who have a valid msitprogram.net email account. Please contact help@msitprogram.net in for help."}), 401


@app.route("/api/tasks", methods=["GET"])
@cross_origin()
def getTasks():
    # to provide the tasks to be done for an individual
    print("getting the tasks")
    email = parse.unquote(request.args.get("email"))
    taskList = tasks[email]
    if (len(taskList) > 0):
        return jsonify({'tasks': taskList}), 200
    return jsonify({'error': 'No tasks found'}), 401


@app.route("/api/saveData", methods=["GET"])
@cross_origin()
def saveData():
    # to save the data (urls) for a task of an individual user
    print("saving the data")
    taskname = request.args.get("taskname")
    email = parse.unquote(request.args.get("email"))
    urls = parse.unquote(request.args.get("urls"))
    if(urls == ""):
        return "No urls present to add"
    else:
        listurls = list(urls.split(" "))[:-1]
        flag = False
        for i in db.db.userData_URL.find({'_id': email}):
            if taskname in i['tasks'].keys():
                flag = True
                break
        if not flag:
            # the task doesnt exist - create a new task object and add it to tasks
            tasksObj = {}
            for i in db.db.userData_URL.find({'_id': email}):
                for each in i['tasks'].keys():
                    tasksObj[each] = i['tasks'][each]
            tasksObj[taskname] = list(set(listurls))
            db.db.userData_URL.update_one({'_id': email}, {
                "$set": {"tasks": tasksObj}})
        else:
            # the task already exists, so append the list to the exiting list of urls
            for i in db.db.userData_URL.find({'_id': email}):
                urlList = i['tasks'][taskname]
                urlList.extend(listurls)
            db.db.userData_URL.update_one({'_id': email}, {
                "$set": {"tasks." + taskname: list(set(urlList))}})
        return "Connected to the data base!"


@app.route("/api/suggestions", methods=["GET"])
@cross_origin()
def getSuggestions():
    # to provide suggestions(urls) for a particular assignment
    print('getting suggestions')
    task = request.args.get("task")
    tn = 'tasks.'+task
    if (db.db.userData_URL.find({tn: {'$exists': True}}).count()) == 0:
        return jsonify({"error": "No suggestions present for this task"}), 401
    else:
        list1 = db.db.userData_URL.find({tn: {'$exists': True}})
        listUrls = []
        for i in list1:
            if task in i['tasks'].keys():
                listUrls.extend(i['tasks'][task])
        return jsonify({'data': list(set(listUrls))}), 200


@app.route("/api/userData", methods=["GET"])
@cross_origin()
def getUserData():
    # to get the saved user data
    print('getting user data')
    email = parse.unquote(request.args.get("email"))
    list1 = db.db.userData_URL.find_one({'_id': email})['tasks']
    if (len(list1) == 0):
        return jsonify({"error": "No data present"}), 401
    else:
        user_data = []
        for i in list1:
            task = {
                'taskName': i,
                'urls': list1[i]
            }
            user_data.append(task)
        return jsonify({'data': user_data}), 200


@app.route("/api/msg", methods=["GET"])
@cross_origin()
def sendMsg():
    # to send a msg
    print("sending message")
    from_email = parse.unquote(request.args.get("fromE"))
    to_email = parse.unquote(request.args.get("toE"))
    msg = parse.unquote(request.args.get("message"))
    msg_time = datetime.now().strftime("%d/%m/%Y, %H:%M:%S")
    to = to_email[:-16]
    if (to.lower() in ['all', 'students', 'mentors']):
        to_list = []
        if to.lower() == 'all':
            to_list.extend(auth_users['students'])
            to_list.extend(auth_users['mentors'])
        elif to.lower() == 'students':
            to_list.extend(auth_users['students'])
        else:
            to_list.extend(auth_users['mentors'])
        for each in to_list:
            if from_email != each:
                recMsgHelper(from_email, each, msg, msg_time)
        sendMsgHelper(from_email, to_email.lower(), msg, msg_time)
    else:
        if (to_email == from_email):
            return jsonify({"error": "Cannot send a msg to yourself"}), 401
        elif ((to_email in auth_users['students']) or (to_email in auth_users['mentors'])):
            sendMsgHelper(from_email, to_email, msg, msg_time)
            recMsgHelper(from_email, to_email, msg, msg_time)
        else:
            return jsonify({"error": "Invalid user name"}), 401
    return jsonify({"status_msg": "sent"}), 200


def sendMsgHelper(from_email, to_email, msg, msg_time):
    # update sender
    sent_flag = False
    to = to_email[:-16].replace('.', '')
    for i in db.db.userData_URL.find({'_id': from_email}):
        for j in i['msgs']['sent'].keys():
            if to in j:
                sent_flag = True
                msgList = i['msgs']['sent'][to]
                msgList.append([msg, msg_time])
                db.db.userData_URL.update_one({'_id': from_email}, {
                    "$set": {"msgs.sent." + to: list(msgList)}})
                break
    if not sent_flag:
        # first msg to to_email
        db.db.userData_URL.update_one({"_id": from_email}, {
            "$set": {"msgs.sent." + to: [[msg, msg_time]]}})


def recMsgHelper(from_email, to_email, msg, msg_time):
    # update receiver
    rec_flag = False
    unread_flag = False
    from_e = from_email[:-16].replace('.', '')
    for i in db.db.userData_URL.find({'_id': to_email}):
        for j in i['msgs']['rec'].keys():
            if from_e in j:
                rec_flag = True
                msgList = i['msgs']['rec'][from_e]
                msgList.append([msg, msg_time])
                db.db.userData_URL.update_one({'_id': to_email}, {
                    "$set": {"msgs.rec." + from_e: list(msgList)}})
                break
        for j in i['msgs']['unread'].keys():
            if from_e in j:
                unread_flag = True
                msgList = i['msgs']['unread'][from_e]
                msgList.append([msg, msg_time])
                db.db.userData_URL.update_one({'_id': to_email}, {
                    "$set": {"msgs.unread." + from_e: list(msgList)}})
                break
    if not rec_flag:
        # first msg to to_email
        db.db.userData_URL.update_one({"_id": to_email}, {
            "$set": {"msgs.rec." + from_e: [[msg, msg_time]]}})
    if not unread_flag:
        db.db.userData_URL.update_one({"_id": to_email}, {
            "$set": {"msgs.unread." + from_e: [[msg, msg_time]]}})


@app.route("/api/sent", methods=["GET"])
@cross_origin()
def sentLogs():
    # to fetch sent logs
    print('getting sent msgs')
    email = parse.unquote(request.args.get("email"))
    if (len(db.db.userData_URL.find_one({'_id': email})['msgs']['sent']) == 0):
        return jsonify({"error": "No msgs sent until!!"}), 401
    else:
        list1 = db.db.userData_URL.find_one({'_id': email})['msgs']['sent']
        return jsonify(list1), 200


@app.route("/api/recv", methods=["GET"])
@cross_origin()
def recvLogs():
    # to fetch receive logs
    print('getting recv msgs')
    email = parse.unquote(request.args.get("email"))
    if (len(db.db.userData_URL.find_one({'_id': email})['msgs']['rec']) == 0):
        return jsonify({"error": "No msgs received until!!"}), 401
    else:
        list1 = db.db.userData_URL.find_one({'_id': email})['msgs']['rec']
        return jsonify(list1), 200


@app.route("/api/checkUnread", methods=["GET"])
@cross_origin()
def checkUnread():
    # to check number of unread messages
    print("Checking unread messages")
    email = parse.unquote(request.args.get("email"))
    if (len(db.db.userData_URL.find_one({'_id': email})['msgs']['unread']) == 0):
        return jsonify({"error": "No unread messages"}), 401
    else:
        count = 0
        list1 = db.db.userData_URL.find_one({'_id': email})['msgs']['unread']
        for i in list1:
            count += len(list1[i])
        return jsonify(count), 200


@app.route("/api/displayUnread", methods=["GET"])
@cross_origin()
def displayUnread():
    # to display the unread messages
    print('getting unread msgs')
    email = parse.unquote(request.args.get("email"))
    if (len(db.db.userData_URL.find_one({'_id': email})['msgs']['unread']) == 0):
        return jsonify({"error": "No unread messages"}), 401
    else:
        list1 = db.db.userData_URL.find_one({'_id': email})['msgs']['unread']
        db.db.userData_URL.update_one({"_id": email}, {
            "$set": {"msgs.unread": {}}})
        return jsonify(list1), 200


@app.route("/api/getUsernames", methods=["GET"])
@cross_origin()
def getUsernames():
    # to provide the list of usernames
    print('getting user names')
    user = parse.unquote(request.args.get("email"))[:-16]
    emails = []
    usernames = ['mentors', 'students', 'all']
    emails.extend(auth_users['mentors'])
    emails.extend(auth_users['students'])
    for email in emails:
        if (user != email[:-16]):
            usernames.append(email[:-16])
    return jsonify({'names': usernames}), 200
