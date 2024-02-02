from flask import *
from flask_cors import CORS
from flask_mysqldb import MySQL
from datetime import timedelta
from uuid import UUID
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import flask
import base64
import os
import random
import string
import hashlib
import validators
import bcrypt


# Auxiliary functions
def valid_uuid(value): # Check if value is a valid UUIDv4
    try:
        uuid_obj = UUID(value, version=4)
    except ValueError:
        return False
    return str(uuid_obj) == value

def is_empty(any_structure): # Check if struture is empty
    if any_structure:
        return False
    else:
        return True

def validateURL(field1, field2): # Check if URL fields (Name and NIF) are correct
    if (field1 is not None and field2 is not None and field1 and field2):
        if(str.isdecimal(field2) and len(field2)==9):
            return True
        else:
            return False
    else:
        return False

def generateKey(): # Generate a user's authentication key (used to encrypt database and authenticate through the UAP)
    strPass = ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(16))
    password = strPass.encode()
    salt = os.urandom(16)

    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(),
                    length=32,
                    salt=salt,
                    iterations=200000,
                    backend=default_backend())

    key = base64.urlsafe_b64encode(kdf.derive(password))
    return key.decode()

def infoCombo(key, NIF, Nome): # Hash information
    value = NIF[0:3]+Nome.replace(" ", "")+NIF[-6:]
    m = hashlib.sha256()
    m.update(value.encode())
    hashed_data = m.digest()
    return (key+base64.urlsafe_b64encode(hashed_data).decode())
    

# Configure App
app = flask.Flask(__name__, static_folder='templates')
app.secret_key = '5368566D597133743677397A244326452948404D635166546A576E5A7234753778214125442A472D4A614E645267556B58703273357638792F423F4528482B4D'
app.permanent_session_lifetime = timedelta(hours=8)


# Connect to database (MUST USE LEGACY AUTHENTICATION METHOD (RETAIN MYSQL 5.X COMPATIBILITY))
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'SIO21G04'
app.config['MYSQL_DB'] = 'uap'
mysql = MySQL(app)
CORS(app)

# Routes
@app.route('/')
def index():
    if not session.get('username') or session.get('username') is None:  
        return render_template('index.html')
    else:
        return redirect('/dashboard')


@app.route('/act-key')
def activate_key():
    if not session.get('username') or session.get('username') is None: 
        return render_template("activate_key.html")
    else:
        return redirect('/dashboard')


@app.route('/act-key/gen-key')
def generate_key():
    if not session.get('username') or session.get('username') is None:
        if validateURL(request.args.get('name'), request.args.get('NIF')):
            autKey=''
            while(True):
                autKey = generateKey()
                try:   
                    cur = mysql.connection.cursor()
                    cur.callproc('uap.SELECT_USER', [autKey])
                    userInfo = cur.fetchall()
                    if not is_empty(userInfo):
                        cur.close()
                    else:
                        cur.close()
                        break
                except Exception as e:
                    return redirect('/act-key')
            return render_template("generate_key.html", userKey = autKey, name = request.args.get('name'), nif = request.args.get('NIF'))
        else:
            return redirect('/act-key')
    else:
        return redirect('/dashboard')


@app.route('/dashboard')
def show_dashboard():
    if not session.get('username') or session.get('username') is None:  
        return redirect('/')
    else:
        return render_template("dashboard.html", username = session.get('username'), nif = session.get('NIF'))


@app.route('/link-account')
def link_account():
    if not session.get('username') or session.get('username') is None:  
        return redirect('/')
    else:
        return render_template("link_account.html", codeValue="")


@app.route('/see-accounts')
def see_accounts():
    if not session.get('username') or session.get('username') is None:  
        return redirect('/')
    else:
        hKey = [session['hashVal'][0:44]]
        try:
            cur = mysql.connection.cursor()
            cur.callproc('uap.SELECT_ALL_ACCOUNTS', hKey)
            completed = cur.fetchall()
            cur.close()
            return render_template("see_accounts.html", allAccounts=completed)
        except Exception as e:
            return render_template("see_accounts.html", codeValue=2)


@app.route('/edit-account', methods = ["POST", "GET"])
def edit_account():
    if not session.get('username') or session.get('username') is None:  
        return redirect('/')
    else:
        if flask.request.method == 'GET':
            return redirect('/see-accounts')
        else:
            session["editDNS"] = request.json["dnsName"]
            session["editEmail"] = request.json["emailValue"]
            return redirect('/edit-account/show-details', 302)


@app.route('/edit-account/show-details')
def show_edit():
    if not session.get('username') or session.get('username') is None:  
        return redirect('/')
    else:
        if not session.get('editDNS') or not session.get('editEmail') or session.get('editEmail') is None or session.get('editDNS') is None or is_empty(session["editDNS"]) or is_empty(session["editEmail"]):
            return redirect('/see-accounts')
        else:
            return render_template("edit_account.html", showDNS=session["editDNS"], showEmail=session["editEmail"])


# When choosing UAP Authentication in another Web Page, the user will be redirected here
# In this page, he will be able to choose which account to login in a certain DNS
@app.route('/uap-auth/<path:dns>/<string:authEndpoint>')
def uap_authenticate(dns, authEndpoint):
    if(validators.url(dns)):
        return render_template("uap_auth.html", clientDNS=dns, startEndpoint=authEndpoint)
    else:
        return render_template("404.html")


# Calculate challenge response
@app.route('/calculate_challenge', methods=['POST', 'GET'])
def calculate_response():
    if flask.request.method == 'POST':
        try:   
            cur = mysql.connection.cursor()
            cur.callproc('uap.SELECT_SINGLE_ACCOUNT_PASS', [request.json["key"], request.json["dns"], request.json["email"]])
            userInfo = cur.fetchall()

            if not is_empty(userInfo):
                hshPass = bcrypt.hashpw(userInfo[0][0].encode('utf8'), request.json["csalt"].encode('utf8'))
                value = request.json["cNonce"] + hshPass.decode()
                challResp = hashlib.sha256(value.encode('utf-8')).hexdigest()
                cur.close()
                return jsonify(resp=challResp)
            else:
                cur.close()
                return jsonify(generateKey())

        except Exception as e:
            print(e)
            return jsonify(generateKey())
    else:    
        return render_template("404.html")


# Show the available accounts to login on a certain DNS
@app.route('/show-possible-accounts', methods=['POST', 'GET'])
def show_possible_accounts():
    if flask.request.method == 'POST':
        hKey = request.json["uKey"]
        dnsN = request.json["dnsName"]
        try:
            cur = mysql.connection.cursor()
            cur.callproc('uap.SELECT_ALL_DNS_ACCOUNTS', [hKey, dnsN])
            completed = cur.fetchall()
            cur.close()
            if not is_empty(completed):
                return jsonify(codeValue=1, availAccounts=completed, uKey = hKey)
            else:
                return jsonify(codeValue=2)
        except Exception as e:
            return jsonify(codeValue=3)
    else:
        return render_template("404.html")


# User Sign-up
@app.route('/signup', methods=['POST', 'GET'])
def signup():
    if not session.get('username') or session.get('username') is None:
        if flask.request.method == 'POST':
            autKey = flask.request.form.get('key')
            name = request.args.get('name')
            uNIF = request.args.get('NIF')
            try:
                cur = mysql.connection.cursor()
                cur.callproc('uap.CREATE_USER', [name, uNIF, autKey])
                mysql.connection.commit()
                completed = cur.rowcount

                if completed==1:
                    cur.close()
                    session['username'] = name
                    session['NIF'] = uNIF
                    session['hashVal'] = infoCombo(autKey, uNIF, name)
                    return redirect("/dashboard")
                else:
                    cur.close()
                    return redirect('/act-key')

            except Exception as e:
                return redirect('/act-key')
        else:
            return render_template("404.html")
    else:
        return redirect('/dashboard')


# User Sign-In
@app.route('/signin', methods=['POST', 'GET'])
def signin():
    if not session.get('username') or session.get('username') is None:
        if flask.request.method == 'POST':
            autKey = flask.request.values.get('password')
            try:   
                cur = mysql.connection.cursor()
                cur.callproc('uap.SELECT_USER', [autKey])
                userInfo = cur.fetchall()

                if not is_empty(userInfo):
                    session['username'] = userInfo[0][0]
                    session['NIF'] = userInfo[0][1]
                    session['hashVal'] = infoCombo(autKey, userInfo[0][1], userInfo[0][0])
                    cur.close()
                    return redirect("/dashboard")
                else:
                    cur.close()
                    return redirect('/')

            except Exception as e:
                return redirect('/')
        else:
            return redirect('/')
    else:
        return redirect('/dashboard')


# Link Account to UAP
@app.route('/finalize-link', methods=['POST', 'GET'])
def finalize_link():
    if not session.get('username') or session.get('username') is None:
        return redirect('/')

    else:
        if flask.request.method == 'POST':
            dnsName = flask.request.values.get('dns')
            email = flask.request.values.get('mail')
            password = flask.request.values.get('password')
            authkey = flask.request.values.get('authkey')
            
            try:   
                cur = mysql.connection.cursor()
                cur.callproc('uap.CREATE_ACCOUNT', [authkey, dnsName, email, password])
                mysql.connection.commit()
                cur.close()
                return render_template("link_account.html", codeValue=1)

            except Exception as e:
                return render_template("link_account.html", codeValue=2)
        else:
            return redirect('/link-account')


# Alter a DNS Account Details
@app.route('/alter-data', methods=['POST', 'GET'])
def alter_data():
    if not session.get('username') or session.get('username') is None:
        return redirect('/')
    else:
        if not flask.request.form.get('id_mail') or flask.request.form.get('id_mail') is None or not flask.request.form.get('id_key') or flask.request.form.get('id_key') is None or not session.get('editDNS') or not session.get('editEmail') or session.get('editEmail') is None or session.get('editDNS') is None or is_empty(session["editDNS"]) or is_empty(session["editEmail"]):
            return redirect('/see-accounts')
        else:
            if flask.request.method == 'POST':
                    autK = flask.request.form.get('id_key')
                    newMail = flask.request.form.get('id_mail')
                    newPass = flask.request.form.get('id_pass')
                    sameDNS = session.get('editDNS')

                    if(autK != session["hashVal"][0:44]):
                        return render_template("edit_account.html", showDNS=session["editDNS"], showEmail=session["editEmail"], codeValue=2)

                    if(newMail == session["editEmail"] and not flask.request.form.get('id_pass')):
                        return render_template("edit_account.html", showDNS=session["editDNS"], showEmail=session["editEmail"], codeValue=3)

                    else:
                        if(not flask.request.form.get('id_pass')):
                            try:
                                cur = mysql.connection.cursor()
                                cur.callproc('uap.EDIT_ACCOUNT_INFO_NOPASS', [session["NIF"],sameDNS, newMail, autK])
                                mysql.connection.commit()
                                cur.close()
                                session["editEmail"] = newMail
                                session["editDNS"] = sameDNS
                                return render_template("edit_account.html", showDNS=session["editDNS"], showEmail=session["editEmail"], codeValue=1)

                            except Exception as e:
                                return render_template("edit_account.html", showDNS=session["editDNS"], showEmail=session["editEmail"], codeValue=4)
                        else:
                            try:
                                cur = mysql.connection.cursor()
                                cur.callproc('uap.EDIT_ACCOUNT_INFO_PASS', [session["NIF"], sameDNS, newMail, newPass, autK])
                                mysql.connection.commit()
                                cur.close()
                                session["editEmail"] = newMail
                                session["editDNS"] = sameDNS
                                return render_template("edit_account.html", showDNS=session["editDNS"], showEmail=session["editEmail"], codeValue=1)

                            except Exception as e:
                                return render_template("edit_account.html", showDNS=session["editDNS"], showEmail=session["editEmail"], codeValue=4)
            else:
                return redirect('/see-accounts')


# User Sign-out
@app.route('/logout', methods=['POST', 'GET'])
def signout():
    if flask.request.method == 'POST':
        session.clear()
        return redirect('/')
    else:
        return render_template("404.html")


# 404
@app.errorhandler(404)
def not_found(e):
  return render_template("404.html")


# Prevents going-back to certain pages after login or logout
@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response


# Run app
if __name__ == '__main__':
    app.run(host="localhost", port=4000, debug=True)
