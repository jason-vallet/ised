from ISEDApp import app
from ISEDApp.functions import initial_feature_extraction, search_regions, allowed_file, reset_all_param
import soundfile as sf

from flask import Flask, render_template, request, make_response
from flask import redirect, url_for, send_from_directory
from werkzeug.utils import secure_filename
import json
import numpy as np
import os


APP_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FOLDER = os.path.join(APP_ROOT, 'output')
TRAININGFEATURES_FOLDER = os.path.join(APP_ROOT, 'training_features')
MODEL_FOLDER = os.path.join(APP_ROOT, 'model_data')
UPLOAD_FOLDER = os.path.join(APP_ROOT, 'uploads')
CURRNETAUDIOPATH_FOLDER = os.path.join(APP_ROOT,'currentAudioPath')


ratio_hop_sec = app.config['RATIO_HOP_SEC']


@app.route('/')
def index():
	return render_template('main.html')


@app.route('/submitCorrections', methods = ['GET', 'POST'])
def submit_corrections():
	print('SUBMITCORRECTIONS')
	numOfNeighbors = 5

	confidence = 0.0

	response = 'Success'

	if request.method == 'POST':
		corrections = request.form['feedback']
		corrections = json.loads(corrections)

		

		is_initial = request.form['isInit']

		
		#OUTPUT_FOLDER = os.path.join(APP_ROOT, 'output')
		# with open(os.path.join(OUTPUT_FOLDER, 'corrections.json'), 'w') as f:
		# 	f.write(corrections)
		
		# f2 = open(os.path.join(OUTPUT_FOLDER, 'corrections.json'), "r")
		
		# corrections = json.load(f2)

		if is_initial == 'true':
			for c in corrections:
				start = corrections[c][0]
				end = corrections[c][1]
				seg_win_sec = abs(start - end)

				seg_hop_sec = seg_win_sec*ratio_hop_sec
				
			file_path = app.config['CURRENT_AUDIO_PATH']
			overallFeatures, audio = initial_feature_extraction(file_path, seg_win_sec,seg_hop_sec)
			#overallFeaturesVec = buildInputVector(overallFeatures)
			app.config['CURRNET_FEATURES'] = overallFeatures
			audio_array_path = os.path.join(OUTPUT_FOLDER, 'currentAudioArray.npy')
			sf.write(os.path.join(OUTPUT_FOLDER, 'audio_edit.wav'), audio, app.config['SAMPLING_RATE'], subtype='PCM_24')
			#np.save(audio_array_path, audio)

		initialQuery_sec = request.form['initialQuery']
		# initialQuery_sec: string format => json(dictionary format)
		initialQuery_sec = json.loads(initialQuery_sec)

		for init in initialQuery_sec:
			start = initialQuery_sec[init][0]
			end = initialQuery_sec[init][1]
			seg_win_sec = abs(start - end)
			seg_hop_sec = seg_win_sec*ratio_hop_sec

		print('win_sec:::: ', seg_win_sec)
		print('hop_sec::: ', seg_hop_sec)

		features = app.config['CURRNET_FEATURES']

		#audioArrayPath = os.path.join(OUTPUT_FOLDER, 'currentAudioArray.npy')
		#audio = np.load(audioArrayPath)
		audio, sr = sf.read(os.path.join(OUTPUT_FOLDER, 'audio_edit.wav'), dtype='float32')
		
		returnedRegions, confidence = search_regions(audio, corrections, features, numOfNeighbors, seg_win_sec, seg_hop_sec)

		response = make_response(json.dumps(returnedRegions))

	if request.method == 'GET':
		response = make_response(json.dumps({'confidence':confidence}))

	return response

@app.route('/submitCorrections_initQuery', methods = ['GET', 'POST'])
def submit_corrections_initQuery():
	print('SUBMITCORRECTIONS')
	numOfNeighbors = 5

	response = 'init query Success'

	if request.method == 'POST':

		# filePath = app.config['CURRENT_AUDIO_PATH_MODAL']

		init_region = request.form['init_region']
		init_region = json.loads(init_region)
		# OUTPUT_FOLDER = os.path.join(APP_ROOT, 'output')

		# with open(os.path.join(OUTPUT_FOLDER, 'init_region.json'), 'w') as f:
		# 	f.write(init_region)
		
		# f2 = open(os.path.join(OUTPUT_FOLDER, 'init_region.json'), "r")
		
		# print 'init_region1:', init_region
		# init_region = json.load(f2)
		# print 'init_region22: ', init_region

		for c in init_region:
			start = init_region[c][0]
			end = init_region[c][1]
			seg_win_sec = abs(start - end)

			seg_hop_sec = seg_win_sec*ratio_hop_sec

		file_path = app.config['CURRENT_AUDIO_PATH']
		overallFeatures, audio = initial_feature_extraction(file_path, seg_win_sec,seg_hop_sec)
		app.config['CURRNET_FEATURES'] = overallFeatures

		audio_array_path = os.path.join(OUTPUT_FOLDER, 'currentAudioArray.npy')
		#np.save(audio_array_path, audio)
		sf.write(os.path.join(OUTPUT_FOLDER, 'audio_edit.wav'), audio, app.config['SAMPLING_RATE'], subtype='PCM_24')


		# min_max_scaler = preprocessing.MinMaxScaler(feature_range=(0,1))
		# min_max_scaler.fit(overallFeaturesVec)
		
		print('Feature length', len(overallFeatures))
		print(overallFeatures[0])



		returnedRegions, confidence = search_regions(audio, init_region, overallFeatures, numOfNeighbors, seg_win_sec, seg_hop_sec, is_init_query=True)

		response = make_response(json.dumps(returnedRegions))

	return response

@app.route('/run')
def run():
	print('RUN')

	#filePath = askopenfilename()
	#querystring = request.args
	filePath = os.path.join(UPLOAD_FOLDER, request.args.get('name'))

	"""
	fileChars = list(filePath)
	filePath = ""

	for i in range(0, len(fileChars)):
		if fileChars[i] == " ":
			filePath += "_"
		elif fileChars[i] == "(" or fileChars[i] == ")":
			filePath += ""
		else:
			filePath += fileChars[i]
	"""
	
	app.config['CURRENT_AUDIO_PATH'] = filePath
	
	return 'sucess'

@app.route('/run_modal')
def run_modal():

	filePath = os.path.join(UPLOAD_FOLDER, request.args.get('name'))

	"""
	fileChars = list(filePath)
	filePath = ""

	for i in range(0, len(fileChars)):
		if fileChars[i] == " ":
			filePath += "_"
		elif fileChars[i] == "(" or fileChars[i] == ")":
			filePath += ""
		else:
			filePath += fileChars[i]
	"""
	
	print('filePath', filePath)
	app.config['CURRENT_AUDIO_PATH_MODAL'] = filePath
	
	return 'sucess'#response

@app.route('/js/<path:path>')
def sendjs(path):
	return send_from_directory('js', path)


@app.route('/uploads/<filename>')
def uploaded_file(filename):
	return send_from_directory(app.config['UPLOAD_FOLDER'],
		filename)

@app.route('/submit', methods = ['GET', 'POST'])
def upload_file():
	
	reset_all_param()

	if request.method == 'POST':
		file = request.files['file']
		#userSelectionInst = request.files['inst']
		if file and allowed_file(file.filename):
			filename = secure_filename(file.filename)
			file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
			return redirect(url_for('uploaded_file',
									filename=filename))
	return '''
	<!doctype html>
	<title>Upload new File</title>
	<h1>Upload new File</h1>
	<form action="" method=post enctype=multipart/form-data>
		<p><input type=file name=file>
			<input type=submit value=Upload>
	</form>
	'''
