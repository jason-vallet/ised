import os
from flask import Flask

#from flask.ext.mysql import MySQL

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FOLDER = os.path.join(APP_ROOT, 'output')
TRAININGFEATURES_FOLDER = os.path.join(APP_ROOT, 'training_features')
MODEL_FOLDER = os.path.join(APP_ROOT, 'model_data')
UPLOAD_FOLDER = os.path.join(APP_ROOT, 'uploads')
CURRNETAUDIOPATH_FOLDER = os.path.join(APP_ROOT,'currentAudioPath')


app = Flask(__name__)
#app = Flask('application')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# ratio hop size / window size 
app.config['RATIO_HOP_SEC'] = 1.0

app.config['FRAME_SIZE'] = 2048 # 46ms at 44100Hz
app.config['HOP_SIZE'] = 1024

app.config['FRAME_SIZE_SEC'] = 0.025
app.config['HOP_SIZE_SEC'] = 0.01

app.config['STANDARDIZED_DISTANCE'] = True
app.config['RELEVANCE_INDICES'] = []
app.config['DISTANCES_OUTPUT'] = {}
app.config['DISTANCES_OUTPUT_NORM'] = {}

app.config['MIN_REG_LENGTH'] = 0.3
#when computing relevance score, how many NNs are considered?
app.config['RELEVANCE_SCORE_THRESHOLD'] = 0
app.config['ITERATION'] = 0

app.config['POS_X'] = []
app.config['NEG_X'] = []
app.config['NEW_REGION'] = []
app.config['ALLOWED_EXTENSION'] = set(['wav', 'mp3'])

app.config['SAMPLING_RATE'] = 0
app.config['SAMPLING_RATE_MODAL'] = 0

app.config['AUDIO_START'] = 0
app.config['AUDIO_END'] = 0

app.config['QUERY_X_POS'] = []
app.config['QUERY_X_NEG'] = []
app.config['OPTIMAL_K'] = 1

app.config['CURRENT_AUDIO_PATH'] = ''
app.config['CURRENT_AUDIO_PATH_MODAL'] = ''
app.config['CURRNET_FEATURES'] = {}


from ISEDApp import views


######### flask-mysql test############
# mysql = MySQL()

# app.config['MYSQL_DATABASE_USER'] = 'root'
# app.config['MYSQL_DATABASE_PASSWORD'] = ''
# app.config['MYSQL_DATABASE_DB'] = 'EmpData'
# app.config['MYSQL_DATABASE_HOST'] = 'localhost'
# mysql.init_app(app)

# @app.route("/Authenticate")
# def Authenticate():
#     username = request.args.get('UserName')
#     password = request.args.get('Password')
#     cursor = mysql.connect().cursor()
#     cursor.execute("SELECT * from User where Username='" + username + "' and Password='" + password + "'")
#     data = cursor.fetchone()
#     if data is None:
#      return "Username or Password is wrong"
#     else:
#      return "Logged in successfully"
######### flask-mysql test############



# if __name__ == '__main__':
#     #app.run()
#     app.run(host='0.0.0.0')
