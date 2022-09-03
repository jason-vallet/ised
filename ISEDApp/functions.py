
from ISEDApp import app
import pickle, os, sys, json, math
import scipy.stats as ss
import numpy as np
from sklearn import preprocessing
import librosa


_first_distance = 0
_filePath = ""

_minRegLen = app.config['MIN_REG_LENGTH']
REL_SCORE_THRESHOLD = app.config['RELEVANCE_SCORE_THRESHOLD']

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FOLDER = os.path.join(APP_ROOT, 'output')
TRAININGFEATURES_FOLDER = os.path.join(APP_ROOT, 'training_features')
MODEL_FOLDER = os.path.join(APP_ROOT, 'model_data')
UPLOAD_FOLDER = os.path.join(APP_ROOT,'uploads')
#CURRNETAUDIOPATH_FOLDER = os.path.join(APP_ROOT,'currentAudioPath')
ALLOWED_EXTENSIONS = app.config['ALLOWED_EXTENSION']

def initial_feature_extraction(file_path, seg_win_sec,seg_hop_sec):

	# try:
	# 	raw_audio, sr = librosa.load(path=file_path, sr=None)
	# 	app.config['SAMPLING_RATE'] = sr
	# except:
	# 	print('Cannot load the file. Try another file (filename without special characters)')
	raw_audio, sr = librosa.load(path=file_path, sr=None)
	app.config['SAMPLING_RATE'] = sr

	#Remove zero-signal of the begining and end.
	audio, audioStart, audioEnd = cut_start_end(raw_audio)
	app.config['AUDIO_START'] = audioStart/sr
	app.config['AUDIO_END'] = audioEnd/sr

	print('audio length: ', len(audio)/sr)

	print('extracting features of entire track')
	#features = buildFeatureVectors(audio, fs, frame_sz, hop_sz, seg_win_sec, seg_hop_sec)

	frame_sz = int(app.config['FRAME_SIZE_SEC']*sr)
	hop_sz = int(app.config['HOP_SIZE_SEC']*sr)
	features = build_feature_vectors(audio, sr, frame_sz , hop_sz, seg_win_sec, seg_hop_sec)
	
	return features, audio

def init_file_query_feature_extraction(init_query_region):

	file_path = app.config['CURRENT_AUDIO_PATH_MODAL']
	print('path loaded: ', file_path)
	
	try:
		audio, sr = librosa.load(path=file_path, sr=None)
		app.config['SAMPLING_RATE_MODAL'] = sr
	except:
		print(file_path)
		print('Cannot load the file. Try another file (filename without special characters)')	

	print('Audio loaded')
	query = audio[int(sr*init_query_region[0]) :int(sr*init_query_region[1])]

	#feature = [extract_features_new(query, fs, frame_sz, hop_sz)]
	frame_sz = int(app.config['FRAME_SIZE_SEC']*sr)
	hop_sz = int(app.config['HOP_SIZE_SEC']*sr)
	
	feature = extract_features(query, sr, frame_sz, hop_sz)
	
	return feature

def build_feature_vectors(audio, sr, frame_sz, hop_sz, seg_win_sec, seg_hop_sec):
	print('building feature vectors')
	output = []

	seg_hop_sp = int(sr*seg_hop_sec)
	seg_win_sp = int(sr*seg_win_sec) 

	for index in range(0, len(audio),seg_hop_sp):
		print(index)
		fstart = index
		fend = index+seg_win_sp
		if fend > len(audio):
			fend = len(audio)-1
		seg = audio[int(fstart):int(fend)]

		#features = extract_features_new(seg, fs, frame_sz, hop_sz)
		features = extract_features(seg, sr, frame_sz, hop_sz)
		output.append(features)

		if fend == len(audio)-1:
			break

	return np.array(output)

def extract_features(audio, sr, frame_sz, hop_sz):
	
	mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_fft=frame_sz, hop_length=hop_sz, n_mfcc=14)

	mfccs = mfccs[1:, :]
	mfccs_mean = np.mean(mfccs, axis=1)
	mfccs_var = np.var(mfccs, axis=1)
	mfccs_delta = abs(np.diff(mfccs, axis=1))
	mfccs_dmean = np.mean(mfccs_delta, axis=1)
	mfccs_dvar = np.var(mfccs_delta, axis=1)

	return np.append(np.append(np.append(mfccs_mean, mfccs_var), mfccs_dmean),mfccs_dvar)



def search_regions(audio, feedback, features, numOfNeighbor, win_sec, hop_sec, is_init_query=False):

	sr = app.config['SAMPLING_RATE']
	frame_sz = int(app.config['FRAME_SIZE_SEC']*sr) 
	hop_sz = int(app.config['HOP_SIZE_SEC']*sr)


	#convert feature table into feature vector
	min_max_scaler = []
	#X = buildInputVector(featureTable, min_max_scaler)
	X = features

	min_max_scaler = preprocessing.MinMaxScaler(feature_range=(0,1))
	min_max_scaler.fit(X)
	X = min_max_scaler.transform(X)

	# get sets of feature tables of examples labeled by user (called 'query')
	query_f_pos = []
	query_f_neg = []
	
	for fb in feedback:
		if feedback[fb][2] == 'positive':
			if is_init_query==True:
				print('initqeury extraction')
				tmp = init_file_query_feature_extraction([feedback[fb][0], feedback[fb][1]])
				query_f_pos.append(tmp)
			else:
				query = audio[int(sr*feedback[fb][0]) :int(sr*feedback[fb][1])]
				#query_f_pos.append([extract_features_new(query, fs, frame_sz, hop_sz)])
				query_f_pos.append(extract_features(query, sr, frame_sz, hop_sz))

		elif feedback[fb][2] == 'negative':
			if abs(feedback[fb][0]-feedback[fb][1]) >=app.config['MIN_REG_LENGTH']:
				query = audio[int(sr*feedback[fb][0]) :int(sr*feedback[fb][1])]
				#query_f_neg.append([extract_features_new(query, sr, frame_sz, hop_sz)])
				query_f_neg.append(extract_features(query, sr, frame_sz, hop_sz))

	if is_init_query==True:
		for fb in feedback:
			feedback[fb][2]='candidate'

	if query_f_pos != []:
		#query_X_pos = buildInputVector(query_f_pos, min_max_scaler)
		query_f_pos = min_max_scaler.transform(query_f_pos)

	if query_f_neg != []:
		#query_X_neg = buildInputVector(query_f_neg, min_max_scaler)
		query_f_neg = min_max_scaler.transform(query_f_neg)

	#vote_whole = measureRanking(query_f_pos, query_f_neg, X)
	vote_whole, vote_relScores = measure_ranking(query_f_pos, query_f_neg, X, win_sec, hop_sec, min_max_scaler)
	print('vote_whole')
	print(vote_whole)
	
	# to visualize overall relevnce score:
	#vote_whole_value = sorted(vote_whole.values(), reverse=True)
	#vote_whole_sorted_key = sorted(vote_whole, key=vote_whole.get, reverse=True)
	vote_relScores_sorted_key = sorted(vote_relScores, key=vote_relScores.get, reverse=True)

	relevence_indices = app.config['RELEVANCE_INDICES']

	print('model output index')
	print(vote_relScores_sorted_key)
	relevence_indices.append(vote_relScores_sorted_key)
	#modelChanges = measure_index_distance(relevenceIndics)
	app.config['RELEVANCE_INDICES'] = relevence_indices

	#Deleting all regions overlapped with feedbacks
	to_deleted = []
	sorted_feedback = sort_regions(feedback)

	for fKey in sorted_feedback:
		fbStart = sorted_feedback[fKey][0]
		fbEnd = sorted_feedback[fKey][1]
		for current_reg_key in vote_whole:
			can_start = vote_whole[current_reg_key][0]
			can_end = vote_whole[current_reg_key][1]

			if is_regions_overlapped([can_start, can_end], sorted_feedback[fKey]) == True:
				to_deleted.append(current_reg_key)
				# logging.debug('overlappedRegion_candi %s', [canStart, canEnd])
				# logging.debug('overlappedRegion_feedback %s', sortedFeedback[fKey])
	
	for d in to_deleted:
		if d in vote_whole:
			#logging.debug('deleting %s', vote_whole[d])
			del vote_whole[d]

	combined_regions = add_region(vote_whole, sorted_feedback.values())
	sorted_combined_regions = sort_regions(combined_regions)

	#compute relscore of shrunk regions
	shrunk_regions = []
	for reg_idx in range(len(sorted_combined_regions)-1):
		first_end = sorted_combined_regions[reg_idx][1]
		second_start = sorted_combined_regions[reg_idx+1][0]
		if first_end < second_start:
			shrunk_start = first_end
			shrunk_end = second_start
			if shrunk_end-shrunk_start>_minRegLen:
			
				shrunk_reg = audio[int(sr*shrunk_start) :int(sr*shrunk_end)]
				shrunk_reg_f=[]
				#shrunkReg_f.append([extract_features_new(shrunkReg, fs, frame_sz, hop_sz)])
				shrunk_reg_f.append(extract_features(shrunk_reg, sr, frame_sz, hop_sz))
				#shrunkReg_X = buildInputVector(shrunkReg_f, min_max_scaler)
				shrunk_reg_f_X = min_max_scaler.transform(shrunk_reg_f)
				vote_whole_shrunk, vote_whole_shrunk_relScores = measure_ranking(query_f_pos, query_f_neg, shrunk_reg_f_X, win_sec, hop_sec, min_max_scaler)

				shrunk_regions.append([first_end, second_start, 'candidate', vote_whole_shrunk_relScores[0]])
	
	# combine shrunkREgions with all the other region
	sorted_combined_regions_with_shrunk = sort_regions(add_region(sorted_combined_regions, shrunk_regions))

	sorted_combined_regions_with_shrunk_relScores = {}
	for regkey in sorted_combined_regions_with_shrunk:
		sorted_combined_regions_with_shrunk_relScores[regkey] = sorted_combined_regions_with_shrunk[regkey][3]

	vote_value = sorted(sorted_combined_regions_with_shrunk_relScores.values(), reverse=True)
	vote_sorted_key = sorted(sorted_combined_regions_with_shrunk_relScores, key=sorted_combined_regions_with_shrunk_relScores.get, reverse=True)
	



	returned_regions = {}
	returned_counter = 0
	for i in range(len(sorted_combined_regions_with_shrunk)):
		reg = sorted_combined_regions_with_shrunk[vote_sorted_key[i]]
		
		if reg[2] == 'candidate':
			if returned_counter == 0:
				returned_regions[returned_counter] = reg
				returned_counter+=1
			else:
				overlap_flag = False
				for returnedReg in returned_regions.values():
					if is_regions_overlapped(returnedReg, reg) == True:
						overlap_flag = True
				if overlap_flag == False:
					adjacent = False
					for key in returned_regions:
						if reg[0] == returned_regions[key][1]:
							returned_regions[key][1] = reg[1]
							adjacent = True
							print('reg', reg)
							print('returnedRegions', returned_regions)
							break
						elif reg[1] == returned_regions[key][0]:
							returned_regions[key][0] = reg[0]
							adjacent = True
							print('reg2', reg)
							print('returnedRegions2', returned_regions)
							break
						else:
							adjacent = False
							print('reg3', reg)
							print('returnedRegions3', returned_regions)
							

					if adjacent == False:
						returned_regions[returned_counter] = reg
						returned_counter+=1
				print(returned_regions)
		if returned_counter == numOfNeighbor:
			break

	confidence=0.0
	# if query_f_pos != [] and query_f_neg !=[]:
	# 	confidence = evaluateModel(query_X_pos, query_X_neg)


	return returned_regions, confidence




######### UTIL #######
######################
# def buildInputVector(featureTable, scalar=[]):
# 	X = []
# 	for index in range(len(featureTable)):
# 		featureVector = np.array([])

# 		for i in range(len(selectedFeatures)):
# 			if isinstance(featureTable[index][0][selectedFeatures[i]], float) == True:
# 				featureTable[index][0][selectedFeatures[i]] = np.array([featureTable[index][0][selectedFeatures[i]]])
# 			featureVector = np.concatenate([featureVector, featureTable[index][0][selectedFeatures[i]]])

# 		X.append(featureVector)
# 	if scalar != [] and standardizedDistance == True:
# 		print('normalizing')
# 		X = scalar.transform(X)
	
# 	return X

def cut_start_end(audio):

	for i, sample in enumerate(audio):
		if sample != 0.0:
			audioStart = i
			break

	audioLen = len(audio)
	for i in range(1, audioLen-1):
		if audio[-i]!=0.0:
			audioEnd = audioLen-i
			break


	audio = audio[int(audioStart):int(audioEnd)]
	print('cut done')

	return audio, audioStart, audioEnd

def weighted_euclidean(X, Y, weight):

	'''
	measure Euclidean distance between two vectors, X and Y.
	assign weights to each feature. 
	'''

	temp = 0
	for i in range(len(X)):
		temp += (X[i]-Y[i])*(X[i]-Y[i])*weight[i]
	
	return math.sqrt(temp)

def update_feature_weight(query_X_pos):
	variance = []
	weight = []
	for i in range(len(query_X_pos[0])):
		temp = []
		for x in query_X_pos:
			temp.append(x[i])
		weight.append(1.0/np.var(temp))

	return weight

def update_feature_Weight_fisher(query_X_pos, query_X_neg):
	variance = []
	weight = []
	for i in range(len(query_X_pos[0])):
		tempPos = []
		tempNeg = []
		for pos in query_X_pos:
			tempPos.append(pos[i])
		for neg in query_X_neg:
			tempNeg.append(neg[i])
		meanPos = np.mean(tempPos)
		meanNeg = np.mean(tempNeg)
		varPos = np.var(tempPos)+0.00001
		varNeg = np.var(tempNeg)+0.00001
		fisherScore = math.pow((meanPos-meanNeg),2) / (math.pow(varPos, 2)+ math.pow(varNeg, 2))

		weight.append(fisherScore)
	
	# weightMax = max(weight)
	# temp = []
	# for w in weight:
	# 	temp.append(w/float(weightMax))
	# weight=temp

	return weight

def measure_ranking(query_X_pos, query_X_neg, X, win_sec, hop_sec, min_max_scaler):
	vote_whole = {}
	vote_relScores = {}
	featureWeight = []

	if query_X_pos != []:
		app.config['QUERY_X_POS'] = query_X_pos
	else:
		query_X_pos = []

	if query_X_neg != []:
		app.config['QUERY_X_NEG'] = query_X_neg 
	else:
		query_X_neg = []


	# feature update start after we have more than 3 positive examples
	# otherwise we just assign equal weight onto all features
	if len(query_X_pos)>=3 and len(query_X_neg)>=3:
		featureWeight = update_feature_Weight_fisher(query_X_pos, query_X_neg)
	else:
		featureWeight = np.full(len(X[0]),1.0/len(X[0]))

	if query_X_pos != [] and query_X_neg == []:
		print('case1')
		relScores = []
		for x in X:
			distanceToPos = []
			if query_X_pos != []:
				for q in query_X_pos:
					distanceToPos.append(weighted_euclidean(x, q, featureWeight))
			score = 1.0/min(distanceToPos)
			relScores.append(score)

		for i, val in enumerate(relScores):
			start = round(i * hop_sec + app.config['AUDIO_START'], 2)
			end = round(start + win_sec, 2)

			vote_whole[i] = [start, end, 'candidate', val]
			vote_relScores[i] = val
	
	elif query_X_pos == [] and query_X_neg != []:
		print('case2')

		relScores = []
		for x in X:		
			distanceToNeg = []
			if query_X_neg != []:
				for q in query_X_neg:
					distanceToNeg.append(weighted_euclidean(x, q, featureWeight))
			score = min(distanceToNeg)
			relScores.append(score)

		for i, val in enumerate(relScores):
			start = round(i * hop_sec + app.config['AUDIO_START'], 2)
			end = round(start + win_sec, 2)

			vote_whole[i] = [start, end, 'candidate', val]
			vote_relScores[i] = val

	else:
		print('case3')
		relScores = []
		for x in X:		
			distanceToPos = []
			distanceToNeg = []

			for q in query_X_pos:
				distanceToPos.append(weighted_euclidean(x, q, featureWeight))
		
			for q in query_X_neg:
				distanceToNeg.append(weighted_euclidean(x, q, featureWeight))

			distanceToNeg = sorted(distanceToNeg)
			distanceToPos = sorted(distanceToPos)
			if len(distanceToNeg) >= 2 and len(distanceToPos) >= 2:
				score_set=[]
				if (distanceToNeg[REL_SCORE_THRESHOLD]+distanceToPos[REL_SCORE_THRESHOLD]) <= 0:
					score = 0
				else:
					score = distanceToNeg[REL_SCORE_THRESHOLD] / (distanceToNeg[REL_SCORE_THRESHOLD]+distanceToPos[REL_SCORE_THRESHOLD])
			else:
				score = min(distanceToNeg) / (min(distanceToNeg) + min(distanceToPos))

			relScores.append(score)
		
		print('relScores')
		print(relScores)
		
		for i, val in enumerate(relScores):
			if i>0:
				start = vote_whole[i-1][1]
			else:
				start = round(i * hop_sec + app.config['AUDIO_START'], 2)
			
			end = round(start + win_sec, 2)

			vote_whole[i] = [start, end, 'candidate', val]
			vote_relScores[i] = val

	return vote_whole, vote_relScores


## not needed for the current system
def measure_index_distance(index_history):


	current_itr = app.config['ITERATION']

	print('indexHistory')
	if len(index_history) < 2:
		print(index_history[-1])
	else:
		print(index_history[-1])#current one
		print(index_history[-2]) # last one
		# distance_1 = index_distance(indexHistory[-2],indexHistory[-3])
		# distance_2 = index_distance(indexHistory[-1],indexHistory[-2])
		# #distance = (distance_1-distance_2)/float(_first_distance)
		n_examples = len(index_history[0])
		s1=range(n_examples)
		s2=sorted(s1, reverse=True)
		max_dist = index_distance(s1, s2)

		distance = index_distance(index_history[-1],index_history[-2])
		distances_output = app.config['DISTANCES_OUTPUT']
		distances_output[current_itr] = distance
		
		distances_output_norm = app.config['DISTANCES_OUTPUT_NORM']
		distances_output_norm[current_itr] = float(distance)/max_dist
		app.config['DISTANCES_OUTPUT_NORM'] = distances_output_norm

		current_itr+=1
		app.config['ITERATION'] = current_itr

		# if len(distancesOfOutput) >=3:
		# 	global _first_distance
		# 	_first_distance = float(distancesOfOutput[2] - distancesOfOutput[0])
		# 	print 'NEW CONFIDENCE: ', (distancesOfOutput[-3] - distancesOfOutput[-1]) / _first_distance

		output_path = os.path.join(OUTPUT_FOLDER,'distancesOfOutput.json')



		f = open(output_path, 'w')


		json.dump(distances_output, f)
		f.close()

	distances_output = app.config['DISTANCES_OUTPUT']

	return distances_output


def add_region(current_regions, new_regions):

	'''
	currentRegions: dictionary
	newRegions: array : [[start, end, label, conf], ...]
	'''
	if len(current_regions)==0:
		maxKey = -1
		print(current_regions)
	else:
		maxKey = max(current_regions.keys())


	for i, reg in enumerate(new_regions):
		current_regions[int(maxKey)+1+i] = reg

	return current_regions

def sort_regions(regions):

	startTimes = []
	for val in regions.values():
		startTimes.append(val[0])

	startTimes = list(set(startTimes))
	startTimes = sorted(startTimes)
	

	sorted_regions = {}
	#print startTimes
	for i, t in enumerate(startTimes):
		for val in regions.values():
			if t == val[0]:
				sorted_regions[i] = val
	
	return sorted_regions

def is_regions_overlapped(region1, region2):
	start1 = region1[0]
	end1 = region1[1]
	start2 = region2[0]
	end2 = region2[1]

	is_overlapped=False
	if end1 <= start2 or end2 <= start1:
		is_overlapped = False
	else:
		is_overlapped = True

	return is_overlapped

def index_distance(s1, s2):
	distance = 0

	for i1, c1 in enumerate(s1):
		for i2, c2 in enumerate(s2):
			if c1 == c2:
				distance += abs(i1-i2)



	return distance


def allowed_file(filename):

	return '.' in filename and \
			filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS


	

def reset_all_param():

	app.config['POS_X'] = []
	app.config['NEG_X'] = []
	
	app.config['QUERY_X_POS'] = []
	app.config['QUERY_X_NEG'] = []
	
	
	app.config['ITERATION'] = 0
	
	app.config['RELEVANCE_INDICES'] = []

	app.config['DISTANCES_OUTPUT'] = {}
	app.config['DISTANCES_OUTPUT_NORM'] = {}
