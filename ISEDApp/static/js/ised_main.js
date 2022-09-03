var g_preLoadedFilename = '2016_office_snr-6_12min_22k_norm.mp3';
var g_preLoadedFilename_target = 'speech001_added.wav'

var selectedRegion=null
var regions = [];
var relevent_regions = [];
var past_regions = [];
var removedRegionInfo = null
var editMode = true;
var serverData = null;
var audioFile = null;
var initialUpdated = false;
var isPlaying = false;
var redrawing = false;
var inInputBox = false;
var pencilOn = false;
var tempRegion = null;
var isMoved_1 = false;
var isMoved_2 = false;
var currentRegIndex = -1;
var isInitial = true;
var numOfNeighbors = 5;
var isResume = false;

var regionColors = {
    "negative" : 'rgba(255, 0, 0, 0.5)', // red
    'positive' : 'rgba(0, 0, 255, 0.5)', // blue
    "unknown" : 'rgba(100, 100, 100, 0.3)', // gray
    "candidate" : 'rgba(100, 100, 100, 0.3)' //gray
}

window.onload = function () {
    audio_file.onchange = function () {
        var files = this.files;
        var file = URL.createObjectURL(files[0]);
        
        loadAudio(file, false);
        $('#audio_file').blur();
      };
};



//wavesurfer needs to be re-drawn when the sie of winodw changes dynamically.
$( window ).resize(function() {
    ////console.log("resized")
    newWidth = $("#waveform").width(); 
    wavesurfer.drawer.width =newWidth;
    wavesurfer.drawer.wrapper.childNodes[0].width = newWidth;
    wavesurfer.drawer.wrapper.childNodes[0].style.width = newWidth.toString()+"px";
    //wavesurfer.drawer.wrapper.childNodes[1].childNodes[0].width = newWidth;
    //wavesurfer.drawer.wrapper.childNodes[1].childNodes[0].style.width = newWidth.toString()+"px";
    wavesurfer.drawer.handlers.redraw[0]();

    redrawCurrentRegions();

    newWidth = $("#waveform2").width(); 
    wavesurfer2.drawer.width =newWidth;
    wavesurfer2.drawer.wrapper.childNodes[0].width = newWidth;
    wavesurfer2.drawer.wrapper.childNodes[0].style.width = newWidth.toString()+"px";
    //wavesurfer2.drawer.wrapper.childNodes[1].childNodes[0].width = newWidth;
    //wavesurfer2.drawer.wrapper.childNodes[1].childNodes[0].style.width = newWidth.toString()+"px";
    wavesurfer2.drawer.handlers.redraw[0]();

});

// Keyboard input
$(document).keydown(function(e){
    ////console.log(e.which);
    if (inInputBox == false){
        //Del key
        if (e.which == 8 || e.which == 46) {
            if (editMode==true && selectedRegion!=null){
                deleteRegion()
            };
            return false;
        };
        //32: space bar
        if (e.which == 32){
            e.stopPropagation();
            if(wavesurfer.isPlaying() == false){
               playAudio(-1);
            }
            else{
                stopPlaying();
            };
            
            return false;  //prevent page scrolling by space bar
        }
    }
    else {
            //console.log(e.which)
            //13:enter
            if (e.which == 13){
                //console.log(e.which)
                $('#start').blur();
                $('#end').blur();
            }
    }
        
});

// Init & load audio file
document.addEventListener('DOMContentLoaded', function () {

    var options = {
        container: document.querySelector('#waveform'),
        waveColor: 'gray',
        progressColor: 'purple',
        cursorColor: 'navy',
        scrollParent: true, 
        height: 120,
        //backend: 'MediaElement'
        audioRate: 1.0,
        normalize: true,
        autoCenter: false,
        plugins: [
            WaveSurfer.timeline.create({
                container: '#wave-timeline'
            }),
            WaveSurfer.regions.create({
            })
        ]
    };

    if (location.search.match('scroll')) {
        options.minPxPerSec = 100;
        options.scrollParent = true;
    };

    // Init
    wavesurfer = WaveSurfer.create(options);

    wavesurfer.enableDragSelection({
        color: regionColors['unknown']
    })

    wavesurfer.drawer


    var options2 = {
        container: document.querySelector('#waveform2'),
        waveColor: 'gray',
        progressColor: 'purple',
        cursorColor: 'navy',
        scrollParent: false,
        height: 40,
        plugins: [
            WaveSurfer.timeline.create({
                container: '#wave-timeline2',
                timeInterval: 30,
            }),
            WaveSurfer.regions.create({
            })

        ]
    };

    if (location.search.match('scroll')) {
        options2.minPxPerSec = 100;
        options2.scrollParent = false;
    }

    // // Init
    wavesurfer2 = WaveSurfer.create(options2);

    wavesurfer2.drawer

    wavesurfer2.toggleMute()

    if (location.search.match('scroll')) {
        options.minPxPerSec = 100;
        options.scrollParent = true;
    }


    // $(".btn").mouseup(function(){
    //     ////console.log('button_mouse up')
    //     $(this).blur();
    //     document.getElementById("waveform").focus();
    // })


    // $(currentLabel).change(function () {
    //     defaultLabel = $(currentLabel).val();
    //     if (defaultLabel == "positive"){

    //     }else{

    //     }

    // });

    $("#waveform").mousedown(function(){
        clearTempRegion();
    });

    // $("#waveform_modal").mousedown(function(){
    //     clearTempRegion();
    //     highlightingOff(selectedRegion);
    //     selectedRegion = null;
    //     updateAllRegions();

    // });

    // Load audio from URL
    //wavesurfer.load(URL.createObjectURL(this.files[0]));


    // aligning progress bars of two maps. 
    wavesurfer.on('seek', function (progress) {
        isMoved_2 = true;
        if (isMoved_1 == false){
            wavesurfer2.seekAndCenter(progress);
        }
        isMoved_1 = false
    });
    wavesurfer2.on('seek', function (progress) {
        isMoved_1 = true;
        if (isMoved_2 == false){
            wavesurfer.seekAndCenter(progress);
        }
        isMoved_2 = false
    });

    wavesurfer.on('region-click', function (reg, mouseEvt) {
    
        //console.log('click')
        
        editAnnotation(reg);

        for (var i =0 ; i < regions.length ; i++){
            if (reg.id == regions[i].id){
                currentRegIndex = i;
            }
        }
        
        if (mouseEvt.shiftKey) {
            mouseEvt.stopPropagation();
            wavesurfer.seekTo(reg.start/wavesurfer.getDuration())
            //reg.play();
            //reg.playLoop();
        }

        setSelection(reg.data.label);

    });

    wavesurfer.on('region-dblclick', function (reg, mouseEvt) {

        //console.log('db-click');    
        mouseEvt.stopPropagation();
            //reg.play();
        
        if (wavesurfer.isPlaying()  == false)
        {
            isPlaying = true;        
        }else{
            wavesurfer.pause();
            isPlaying = false;
        }
    });

    wavesurfer.on('pause', function (){

        isPlaying = false
        //console.log("pause");
    });


    wavesurfer.on('region-mouseenter', function (reg, mouseEvt){


        if (editMode==true){
            if (reg != selectedRegion){
                reg.element.style.border="thin solid rgba(255, 0, 0, 1)";
            }
            
        }
        //console.log("mouse moves over");
    });

    wavesurfer.on('region-mouseleave', function (reg, mouseEvt){

        if (editMode==true){
            if (reg != selectedRegion){
                reg.element.style.border="";
            }
            
        }
        //console.log("mouse left");
    });

    wavesurfer.on('region-removed', function (reg){

        //console.log("Region removed");
        if (editMode==true && redrawing==false){
            updateAllRegions()
        }
        
    });

    wavesurfer.on('region-update-end', function (reg) {

        if (reg.data.label == 'positive' || reg.data.label == 'negative' || reg.data.label == 'candidate'){
            updateAllRegions();
        }
    
    //commented out when you are ok with regions overlapped
        CheckRegionIntersections(reg);
    
        if (pencilOn == false){
            if (reg.data.label != 'positive' && reg.data.label != 'negative' && reg.data.label != 'candidate'){
    
                for (var key in wavesurfer.regions.list){
                    // the last one is the temporal region
                    tempRegion = wavesurfer.regions.list[key]
                    
                }
                editAnnotation(tempRegion);
                tempRegion.element.style.border="medium dotted rgba(255, 0, 0, 1.0)";
                    
    
                setSelection(tempRegion.data.label);
                 //Enlarge handles
                
                tempRegion.element.childNodes[0].style.maxWidth="2px"
                tempRegion.element.childNodes[0].style.width="80%"
                tempRegion.element.childNodes[1].style.maxWidth="2px"
                tempRegion.element.childNodes[1].style.width="80%"
    
            }
    
        }else{
    
            // $("#submitButton").removeClass("disabled");
            // $('#submitButton').prop('disabled', false);
            updateAllRegions(); 
    
        }
    
        document.getElementById("waveform").focus();
     
    });

});




//----- Region functions ------
function clearTempRegion(){
    //console.log(tempRegion);
    if (tempRegion!=null && tempRegion!=undefined && tempRegion.data.label==undefined){
        tempRegion.remove();
        tempRegion = null;
    }
}


function CheckRegionIntersections(reg) {
    
    for (var i = 0; i < regions.length; i++) {
        ////console.log("regions[i]: ", regions[i].start, regions[i].end, regions[i].data.label)

        if(reg != regions[i]){

            if((reg.data.label == 'positive' || reg.data.label == 'negative' || reg.data.label == 'candidate') && (regions[i].data.label == 'positive'||regions[i].data.label == 'negative' || regions[i].data.label == 'candidate')){
                var currentRegDuration = reg.end - reg.start;
                var midPosition = regions[i].start + (regions[i].end - regions[i].start)/2.0;
                
                if ((reg.start < regions[i].start && reg.end < regions[i].start) || (reg.start > regions[i].end && reg.end > regions[i].end)){
                    // No interaction
                    ////console.log("No interaction");
                } else {
                    if(Math.abs(midPosition-reg.start) > Math.abs(midPosition-reg.end)){
                       // //console.log("region overlapped A");
                        reg.update({start:regions[i].start-currentRegDuration, end: regions[i].start});

                    }else{
                         ////console.log("region overlapped B");
                         reg.update({start: regions[i].end, end: regions[i].end+currentRegDuration});
                    }
                }
            }
        }
    }
}


function updateAllRegions(){
    if (wavesurfer2.regions != undefined){
        for (var key in wavesurfer2.regions.list){
        var reg = wavesurfer2.regions.list[key]
        reg.remove()
        }
    }

    regions = []
    for (var key in wavesurfer.regions.list){
        ////console.log(wavesurfer.regions.list[key])
        var reg = wavesurfer.regions.list[key]
        if (reg.data.label == undefined){
            reg.update({color: regionColors[defaultLabel]});
            reg.data = {label:defaultLabel}
            //addRegionLabel(reg)
            wavesurfer2.addRegion({ start: reg.start, end: reg.end, color: regionColors[defaultLabel] , drag: false, resize: false, data:{label:defaultLabel}});
        }else{
            regions.push(wavesurfer.regions.list[key])
            wavesurfer2.addRegion({ start: reg.start, end: reg.end, color: regionColors[reg.data.label] , drag: false, resize: false, data:{label:reg.data.label}});
            //console.log(regions.length);

        }

    }

    sortRegions();
    //console.log("checkcheck2222")
    //console.log(regions.length);
    sortRegions_relevent();
    //console.log("checkcheck3333")
    //console.log(regions.length);
    



    //Enlarge handles
    var len = regions.length;
    for (var i = 0; i < len; i++) {
        regions[i].element.childNodes[0].style.maxWidth="2px"
        regions[i].element.childNodes[0].style.width="80%"
        regions[i].element.childNodes[1].style.maxWidth="2px"
        regions[i].element.childNodes[1].style.width="80%"
    }

    //addAllRegionLabels();
}

function sortRegions(){

    var len = regions.length;
    var startTimes = []
    for (var i =0 ; i<len ; i++){
        startTimes.push(regions[i].start)
        
    }
    startTimes.sort(function (a, b) { return a-b;})
    //console.log(startTimes)
    var temp = []

    startTimes = jQuery.unique(startTimes) //For when two regions are at the same location after clicking "partiallly positive"
    for (var i = 0 ; i<startTimes.length;i++){
        for (var j = 0 ; j < len ; j++){
            if (startTimes[i] == regions[j].start){
               // //console.log(startTimes[i])
               // //console.log(regions[j].start)
                temp.push(regions[j])
            }

        }
        
    }
    //console.log('temp')
    regions = temp
}

function sortRegions_relevent(){

    var len = relevent_regions.length;
    var startTimes = []
    for (var i =0 ; i<len ; i++){
        startTimes.push(relevent_regions[i].start)
        
    }
    startTimes.sort(function (a, b) { return a-b;})
    //console.log(startTimes)
    var temp = []

    startTimes = jQuery.unique(startTimes) //For when two regions are at the same location after clicking "partiallly positive"
    for (var i = 0 ; i<startTimes.length;i++){
        for (var j = 0 ; j < len ; j++){
            if (startTimes[i] == relevent_regions[j].start){
               // //console.log(startTimes[i])
               // //console.log(regions[j].start)
                temp.push(relevent_regions[j])
            }

        }
        
    }
    relevent_regions = temp
}


function redrawCurrentRegions(){

    redrawing = true

    var len = regions.length;

    for (var i = 0; i < len; i++) {
        regions[i].remove();
    }
    
    for (var i=0 ; i < len; i++){
        var s = regions[i].start
        var e = regions[i].end
        var d = regions[i].data
        var c = regions[i].color

        regions.splice(i,1);

        var r = wavesurfer.addRegion({ start: s, end: e, data:d, color: c,  drag: true, resize: true});
        //r.update({drag: editMode, resize: editMode});

        regions.splice(i, 0, r);
        CheckRegionIntersections(r);

    }
    //addAllRegionLabels();

    var len = regions.length;
    for (var i = 0; i < len; i++) {

        regions[i].update({ drag: editMode, resize: editMode });
    }

    redrawing = false
}





function clearAll(){}


//-------- control buttons -------
function playAudio(num) {

    if (num == -1){
        if (selectedRegion!=null && tempRegion !=null){
            wavesurfer.play(selectedRegion.start, selectedRegion.end);
            wavesurfer2.play(selectedRegion.start, selectedRegion.end);
           // wavesurfer3.play(tempRegion.start, tempRegion.end);

            //tempRegion.play();
        }else{
            wavesurfer.play();
            wavesurfer2.play();
            //wavesurfer3.play();
        }
        isPlaying = true;
    }
    else{
        //console.log(num);
        playRegionByButton(num);
    }    
}

function stopPlaying(){

    if (wavesurfer.isPlaying() == true){
        wavesurfer.pause();
        wavesurfer2.pause();
    }
    isPlaying = false;
}

function toTheEnd(){
    wavesurfer.seekAndCenter(1)
}

function toTheStart(){

    wavesurfer.seekAndCenter(0)
    //wavesurfer2.seekTo(0)
}

function loadAudio(file, isPreloaded) {
    clearAll()
    wavesurfer.load(file);

    //uploading files and extracting features
    if (isPreloaded==true){
         run_preloaded(g_preLoadedFilename);
     }else{
          run_file(file);
     }
    
    audioFile = file;
    serverData = {};
    
    $("#playButton").removeClass("disabled");
    $('#playButton').prop('disabled', false);
    $("#editButton").removeClass("disabled");
    $('#editButton').prop('disabled', false);

    document.getElementById("playButton").style.opacity = 1;
    document.getElementById("initSubmitButton").style.opacity = 1;
    

    wavesurfer2.load(file)


    $("#submitButton").removeClass("disabled");
    
    
    $('#playButton').prop('disabled', false);
    $('#stopButton').prop('disabled', false);
    $('#toEndButton').prop('disabled', false);
    $('#toBeginButton').prop('disabled', false);
    $('#submitButton').prop('disabled', false);
    $('#initSubmitButton').prop('disabled', false);
    $('#queryByExampleButton').prop('disabled', false);
    

    $('#waveform').focus();

}

function loadPreset(){
    document.getElementById("Instructions").innerHTML = "<font size='+2'><strong>Please wait...</strong></font>";
    document.getElementById("Instructions").className = "alert alert-danger";
    
  
    //var filePath = '/uploads/'+preLoadedFilename
    var filePath = '../uploads/'+g_preLoadedFilename
    //console.log(filePath)
    loadAudio(filePath, true)
    //wavesurfer.load('../static/uploads/2016_office_snr-6_12min_22k_norm.mp3');
  
}

function run_preloaded(fileName) {

    
    $.get('/run', {'name': fileName},
       function (data, textStatus, jqXHR) {
           $("#browseButton").removeClass("disabled");
           $('#browseButton').prop('disabled', false);

           document.getElementById("selectedRegionForm").style.opacity = 1;
          
           ToggleEditMode()      
       });

   // for actualy system
   // document.getElementById("Instructions").innerHTML = "<b>Click and drag with the mouse on the Annotator Track to highlight one example of the sound event you want to find, and click 'Find Similar Regions'.\
   // <br>Alternately, click 'Query-by-Example' to load a short audio file that contains an example of the sound you want to find.</b>";
   //for demo
   document.getElementById("Instructions").innerHTML = "<b>The example track to be labeled is loaded. The track contains various sound events in an office envirnment.\
   (from <a href=\"http://www.cs.tut.fi/sgn/arg/dcase2016/task-sound-event-detection-in-synthetic-audio\">DCASE dataset</a>)<br>Click and drag with the mouse on the Annotator Track to highlight one example of the sound event you want to find, and click 'Find Similar Regions'.\
   <br>Alternately, click 'Query-by-Example' to load a short audio file that contains an example of the sound you want to find.";

   document.getElementById("Instructions").className = "alert alert-success";

}
function ToggleEditMode() {
    //wavesurfer.element.style.position = "relative";
    
    //document.getElementById("InstructionsEdit").style.opacity = 1;
    //document.getElementById("editInstruction").style.opacity = 1;

    //editMode = !editMode;

    //var form = document.forms.edit;
    var form = document.getElementById("selectedRegionForm");
    // if(editMode){
    //   form.style.opacity = 1;
    // }
    // else{
    //     form.style.opacity = 0;
    //     var len = regions.length;
    //     for (var i = 0; i < len; i++) {
    //         regions[i].element.querySelector("#label").style.backgroundColor = "";
    //         regions[i].element.querySelector("#label").style.color = "white";
    //     }
    // }

    var len = regions.length;
    for (var i = 0; i < len; i++) {

        regions[i].update({ drag: editMode, resize: editMode });
    }

    //document.getElementById("startoverButton").style.opacity = 1;
    //$("#startoverButton").removeClass("disabled");
    //$('#startoverButton').prop('disabled', false);
    // //console.log(editMode)
    // regions[0].update({ drag: editMode, resize: editMode });
    // //console.log(editMode)
    // regions[1].update({ drag: editMode, resize: editMode });
    // //console.log(editMode)
    // regions[2].update({ drag: editMode, resize: editMode });

    redrawCurrentRegions()

    if (editMode==false){
        //document.getElementById("deleteButton").style.opacity = 0;
        //document.getElementById("InstructionsEdit").style.opacity = 0;
       // document.getElementById("editInstruction").style.opacity = 0;


        //var form = document.forms.edit;
        var form = document.getElementById("selectedRegionForm");
        form.style.opacity = 0;
        //$("#startoverButton").addClass("disabled");
        //$('#startoverButton').prop('disabled', true);

    }

    // wavesurfer.enableDragSelection({
    //     color: gray
    // })



    
    
    // var selects = [];


    // for (var i = 0; i < len; i++) {
    //     regions[i].update({ drag: editMode, resize: editMode });

    //     var childNodes = regions[i].element.childNodes;
    //     ////console.log("childNodes: ", childNodes);
    //         for (var c = 0; c < childNodes.length; c++) {
    //             ////console.log(childNodes[c]);
    //             if (childNodes[c].id == "label") {
    //                 regions[i].element.removeChild(childNodes[c]);
    //             }
    //         }

    //     if (!editMode) {
    //         var para = document.createElement('span');
    //         para.className = "label label-default";
    //         para.id = "label";
    //         wavesurfer.params.interact = true;
    //         var node = document.createTextNode(regions[i].id);
    //         para.appendChild(node);

    //         regions[i].element.appendChild(para);
    //     }
    //     else {
    //         var para = document.createElement('select');
    //         //para.type = "text";
    //         //para.className = "select";
    //         //para.role = "menu";
    //         //wavesurfer.params.interact = false;
    //         ////console.log(wavesurfer);
    //         para.id = "label";
    //         //para.style.position = "relative";
    //         para.style.position = "absolute";
    //         para.style.left = '30px';
    //         para.style.top = '50px';

    //         para.style.zIndex = 3;
    //         // para.innerHTML = '<option value="cel">Cello</option><option value="cla">Clarinet</option> \
    //         //   <option value="flu">Flute</option><option value="gac">Acoustic Guitar</option><option value="gel">Electric Guitar</option> \
    //         //   <option value="org">Organ</option><option value="pia">Piano</option><option value="sax">Saxophone</option> \
    //         //   <option value="tru">Trumpet</option><option value="vio">Violin</option><option value="voi">Human Voice</option> \
    //         //   <option value="unk">Unknown</option><option value="speech">Speech</option>';
    //         // para.innerHTML = '<option value="instruments">Instrument</option><option value="sining">Singing</option> \
    //         //   <option value="unk">Unknown</option><option value="speech">Speech</option>';
    //         para.innerHTML = '<option value="instruments">Instrument</option><option value="voice">voice</option> \
    //           <option value="unk">Unknown</option>';

    //         regions[i].element.appendChild(para);
    //         c = para.childNodes;
    //         for (var ii = 0; ii < c.length; ii++) {
    //             if (c[ii].value == regions[i].id){
    //                 c[ii].selected = true;
    //             }
    //         }

    //         selects.push(para);

    //         selects[i].onchange = function(){
    //             for (var ii = 0; ii < regions.length; ii++){
    //                 if (regions[ii].element == this.parentElement){
    //                     regions[ii].id = this.value;
    //                     regions[ii].color = instColors[this.value];
    //                     //console.log(regions[ii]);
    //                 }
    //             }
    //         }
    //     }
    //}
    function addOption(selectbox, text, value) {
        var optn = document.createElement("option");
        optn.text = text;
        optn.value = value;
        selectbox.appendChild(optn);
    }

    // //console.log(document.getElementById("editButton").childNodes[0]);

    // if (editMode) {
    //     document.getElementById("editButton").innerHTML = "Disable Editing";
    // }
    // else {
    //     document.getElementById("editButton").innerHTML = "Enable Editing";
    // }
}

//----- other functions-----------


function inputClick(){
    inInputBox= true
}
function exitInput(){
    inInputBox= false
}



function areAllListned(){

    if (isInitial==false){
        var isListend=true
        for (var i=1; i<6;i++){
        var text = $('#neighborsSelect')[0].options[1].text
        if (text.indexOf('NEW') !== -1){
            isListend = false
            }
        }
    }else{
        isListend=true
    }

    return isListend 
}


// play regions that have been labeled by a user ('Already Labeled' section)


function storePastregion(reg){
    var i = regions.indexOf(reg)
    removedRegionInfo = {start: reg.start,
                    end: reg.end,
                    data:reg.data,
                    id: reg.id,
                    color: reg.color,
                    drag:true, resize:true}
}

function undoRemoved(){
    var r = wavesurfer.addRegion(removedRegionInfo)
    //addRegionLabel(r)
    regions.push(r)
    //document.getElementById("undoRemovedButton").style.opacity = 0;
    // document.getElementById("start").style.opacity = 1;
    // document.getElementById("end").style.opacity = 1;
    // document.getElementById("inst").style.opacity = 1;

    //document.forms.edit.style.opacity = 0;
    //document.getElementById("editInstruction").style.opacity = 1;

}

function deleteRegion(){

    storePastregion(selectedRegion)

    var i = regions.indexOf(selectedRegion)
    regions.splice(i, 1)
    past_regions.splice(i,1)
    selectedRegion.remove();
    //document.getElementById("deleteButton").style.opacity = 1;
    document.getElementById("start").style.opacity = 1;
    document.getElementById("end").style.opacity = 1;
}


// function addRegion(){
//     var currentPosition = wavesurfer.getCurrentTime()

//     var r = wavesurfer.addRegion({ start: currentPosition, end: currentPosition+3.0, color: blue, drag: true, resize: true});
//         //r.update({drag: editMode, resize: editMode});
//     updateAllRegions()
//     //regions.splice(i, 0, r);

//     editAnnotation(r);

// }

function editAnnotation (region) {
    selectedRegion = region

    document.getElementById("start").style.opacity = 1;
    document.getElementById("end").style.opacity = 1;

    var form = document.getElementById("selectedRegionForm");
    
    var beforeStart = Math.round(region.start * 10) / 10;
    var beforeEnd = Math.round(region.end * 10) / 10;

    if (editMode){
        form.style.opacity = 1;
        hightlightLabels(region)    
    }
    
    form.elements.start.value = Math.round(region.start * 10) / 10;
    form.elements.end.value = Math.round(region.end * 10) / 10;
    //form.elements.inst.value = region.element.querySelector("#label").innerHTML;


    form.onchange = function (e){
        if (parseFloat(form.elements.start.value) >= parseFloat(form.elements.end.value)){
 
            alert("Error: The end value should be greater than the start value");
        }else{
            region.update({
            start: form.elements.start.value,
            end: form.elements.end.value,
            data: {
            label: form.elements.inst.value
            },
            color: regionColors[form.elements.inst.value]
            
            });
        }

        form.elements.start.value = Math.round(region.start * 10) / 10;
        form.elements.end.value = Math.round(region.end * 10) / 10;

        if (form.elements.inst.value=='positive'){
            // document.getElementById("submitButton").style.opacity = 1;
            // $("#submitButton").removeClass("disabled");
            // $('#submitButton').prop('disabled', false);
            updateAllRegions();
        }
        
        //region.element.querySelector("#label").innerHTML = form.elements.inst.value
    }

    form.onsubmit = function (e) {
        ////console.log(e)
        ////console.log("submit EVENT?>????")
        
        e.preventDefault();

        if (parseFloat(form.elements.start.value) >= parseFloat(form.elements.end.value)){
            //console.log("alert")
            alert("Error: The end value should be greater than the start value");
            //form.elements.end.value = Math.round(region.end * 10) / 10;
        }
        else{
            region.update({
            start: form.elements.start.value,
            end: form.elements.end.value,
            data: {
            label: form.elements.inst.value
            }
        });
        }

        form.elements.start.value = Math.round(region.start * 10) / 10;
        form.elements.end.value = Math.round(region.end * 10) / 10;
        ////console.log(region)
        ////console.log(form.elements.inst.value)
        //region.update({id:form.elements.inst.value})
        ////console.log(region)
        
        //region.element.querySelector("#label").innerHTML = form.elements.inst.value
        //form.style.opacity = 0;
        document.getElementById("updateButton").style.opacity = 0;
    };
    // form.onreset = function () {
    //     form.style.opacity = 0;
    //     form.dataset.region = null;
    // };


    //form.dataset.region = region.id; 
}

function setSelection(valueToSelect){
    //console.log(valueToSelect)
    if (valueToSelect == 'positive'){

        document.getElementById("selectedRegion_value").innerHTML = "<b><i>Positive</i></b>"

    }else if(valueToSelect == "negative"){
        document.getElementById("selectedRegion_value").innerHTML = "<b><i>Negative</i></b>"

    }else{
         document.getElementById("selectedRegion_value").innerHTML = "<b><i>Unknown </i></b>"
    }
    
}

function hightlightLabels(selectedRegion){
    var len = regions.length;
    for (var i = 0; i < len; i++) {

        if (regions[i] == selectedRegion){
            regions[i].element.style.border="medium dotted rgba(255, 0, 0, 1.0)";

        } 
        else{
            regions[i].element.style.border="";
        }

    }
}

// Click 'Find similar regions'
function clickSubmit(){

    if (areAllListned()==true){
        if (tempRegion == null && regions.length == 0){
            alert("You did not select any region. Highlight ONE region that has sound event you are interested in! Then click on 'Find Similar Regions'");

        }else{
            document.getElementById("Instructions").innerHTML = "<font size='+2'><strong>Please wait...</strong></font>";
            document.getElementById("Instructions").className = "alert alert-danger";
            if(isInitial==false){
                //console.log('audomaticlabeling')
                automaticLabeling();
                //labelingNeg_undefined();
            }

            submitCorrections();
            document.getElementById("startoverButton").style.opacity = 1;
        //$("#startoverButton").removeClass("disabled");
            $('#startoverButton').prop('disabled', false);
        }
    }else{

        alert("Please click and listen to all suggested regions in the 'Listen and label these' pannel.");

    }  
}

function initialLabeling(){

    tempRegion.update({data: {label: 'positive'}, color: regionColors['positive']});
    updateAllRegions();
}

function RegionsToJSON(regions) {
    var json = new Object;
    var len = regions.length;
    for (var i = 0; i < len; i++) {
        json[i] = [Math.round(regions[i].start*10)/10, Math.round(regions[i].end*10)/10, regions[i].data.label, -1];
    }
    return json;
}


function submitCorrections() {
    
    if (isInitial == true && isResume == false){
        initialLabeling();
        initialQuery = RegionsToJSON(regions);
    }

    $('#neighborsSelect').prop('disabled', true);
    $('#yesButton').prop('disabled', true);
    $('#noButton').prop('disabled', true);

    
    if (isInitial==false){
        var sel = document.getElementById("neighborsSelect");
        var option_text = 'Loading...'
        for (var i=0;i<5;i++){
             sel.options[i+1].text = option_text;
        }  
    }


    var myData = RegionsToJSON(regions);

    var fd = new FormData();
    fd.append('feedback', JSON.stringify(myData));
    fd.append('isInit',isInitial)
    fd.append('initialQuery', JSON.stringify(initialQuery));


    if(isInitial == true){
        $('#initSubmitButton').remove();
    }

    $.ajax({
        type: "POST",
        url: '/submitCorrections',
        data: fd,
        processData:false,
        contentType:false,
        method: "POST"
    }).done(function(msg){
            serverData = JSON.parse(msg);

            document.getElementById("Instructions").innerHTML = "<font size='+2'><strong>Please wait...</strong></font>";
            document.getElementById("Instructions").className = "alert alert-danger";
            startOver();

            updateAllRegions();
            updatePastRegions();

            genLabeledList();
            genListOfMachineSuggestion();


            document.getElementById("Instructions").innerHTML = "<b>Listen to the 5 example regions in '<i>Listen and label these</i>' pannel (region #1 to #5).\
            <br> 1. Click on the region name (e.g. 'region #1') to hear that region.\
            <br> 2. Select the appropriate label: 'positive' if it contains the sound and 'negative' if it doesn't contain the sound.\
            <br> 3. If the hightlighed region just partially overlap the target sound, adjust the boundaries of the region (click and drag the region in Annotation Track) to fully capture the sound.\
            <br> 4. Once you label all five regions, click 'Find Similar Regions' to get other set of regions to label.";

            document.getElementById("Instructions").className = "alert alert-success";
            //$("#editButton").removeClass("disabled");
            //$('#editButton').prop('disabled', false);
            //$("#analysisButton").addClass("disabled");
            //$('#analysisButton').prop('disabled', true);
            $("#browseButton").removeClass("disabled");
            $('#browseButton').prop('disabled', false);
            $("#checkScoreButton").removeClass("disabled");
            $('#checkScoreButton').prop('disabled', false);

            //document.getElementById("neighbors").style.opacity = 1;

            //document.getElementById("regionSelectionDiv").style.zIndex = 2;
            document.getElementById("regionSelectionDiv").style.opacity = 1;
            $("#submitButton").removeClass("disabled");
      
            $('#noButton').prop('disabled', false);
            $('#yesButton').prop('disabled', false);

            document.getElementById("regionSelection").style.opacity = 1;
            isInitial = false;

            document.getElementById("labeledRegionDiv").style.opacity = 1;
            document.getElementById("labeledRegions").style.opacity = 1;
            
            $('#neighborsSelect').prop('disabled', false);
            $('#yesButton').prop('disabled', false);
            $('#noButton').prop('disabled', false);


            // $.get('/updateToFront',
            // function (data, textStatus, jqXHR) {
            //   //  //console.log("done");
                
            //     //serverData = JSON.parse(data);
            //  //   //console.log('serverData');
            //  //   //console.log(serverData);

            // }).done(function(){
 
            // });genListOfMachineSuggestion
            
            $.get('/submitCorrections',

                function (data, textStatus, jqXHR) {
                  //  //console.log("done");
                    //console.log('test')
                    //console.log(data)
                    var confidence = JSON.parse(data);
                    //console.log(confidence['confidence'])
                    $('#confidence').val(confidence['confidence'])
                });

        })
}

var global_blob
function run_file(blob_file) {
    console.log('Analysis!!!!')
    //Send song
    console.log('blob_file')
    console.log(blob_file)
    console.log('audio_file')
    console.log(audio_file.files[0])
    global_blob= blob_file

    var fd = new FormData();
    //fd.append('file', audio_file.files[0]);
    fd.append('file', audio_file.files[0]);

    $.ajax({
            url: '/submit', 
            data: fd, 
            processData:false, 
            contentType:false, 
            method: "POST"
    }).done(function(){
            // for the actual system
            document.getElementById("Instructions").innerHTML = "<b>Click and drag with the mouse on the Annotator Track to highlight one example of the sound event you want to find, and click 'Find Similar Regions'.\
            <br>Alternately, click 'Query-by-Example' to load a short audio file that contains an example of the sound you want to find.</b>";
              

            document.getElementById("Instructions").className = "alert alert-success";


            $.get('/run', {'name': audio_file.files[0].name},
                function (data, textStatus, jqXHR) {
                    $("#browseButton").removeClass("disabled");
                    $('#browseButton').prop('disabled', false);

                    //document.forms.edit.style.opacity = 1;
                    document.getElementById("selectedRegionForm").style.opacity = 1;
                    ToggleEditMode()
                });
            }).fail(function(){
                alert("Something went wrong. Please reload the page and try again.");

                document.getElementById("Instructions").innerHTML = "<strong>Error</strong>";
                document.getElementById("Instructions").className = "alert alert-danger";
                });
}


function startOver(){

    for (var key in wavesurfer.regions.list){
        ////console.log(wavesurfer.regions.list[key])
        var reg = wavesurfer.regions.list[key]
        ////console.log(reg.data.label)
        if (reg.data.label != "positive" && reg.data.label != "negative"){
            reg.remove()
        }
        
    }

    if (wavesurfer2.regions != undefined) {
        for (var key in wavesurfer2.regions.list){
            ////console.log(wavesurfer2.regions.list[key])
            var reg = wavesurfer2.regions.list[key]
            ////console.log(reg.data.label)
            reg.remove()
            if (reg.data.label != "positive" && reg.data.label != "negative"){
                //reg.remove()
            }
        }
    }
    

    initialUpdateRegions()

    //document.getElementById("undoRemovedButton").style.opacity = 0;
    //document.forms.edit.style.opacity = 0;
   // document.getElementById("editInstruction").style.opacity = 1;

}function initialUpdateRegions() {

    
    initialUpdated = true

    regions = [];
    ////console.log(serverData)
    for (var key in serverData) {
        ////console.log(key);
        ////console.log(serverData[key]);
        
        RegionFromJSON(serverData[key]);
    }
    ////console.log(regions);

    //addAllRegionLabels();

    var len = regions.length;
    for (var i = 0; i < len; i++) {

        regions[i].update({ drag: editMode, resize: editMode });

        //Enlarge handles
        regions[i].element.childNodes[0].style.maxWidth="2px"
        regions[i].element.childNodes[0].style.width="80%"
        regions[i].element.childNodes[1].style.maxWidth="2px"
        regions[i].element.childNodes[1].style.width="80%"
    }

    relevent_regions = []
    for (var i = 0; i < len; i++) {

        relevent_regions[i] = regions[i]
    }

    for (var i = 0; i < len; i++) {

        past_regions.push({start: regions[i].start,
                    end: regions[i].end,
                    data:regions[i].data,
                    id: regions[i].id,
                    drag:true, resize:true});
    }

    initialUpdated = false
}

function RegionFromJSON(jsonRegionArray) {
    var s = jsonRegionArray[0]
    var e = jsonRegionArray[1]
    if (e > wavesurfer.getDuration()){
        e = wavesurfer.getDuration() // 0.05 avoid the error that sizes of regions keep increasing when region.update is called 
    }
    var r = wavesurfer.addRegion({ start: s, end: e, data:{ label:jsonRegionArray[2]}, color: regionColors['candidate'],  drag: true, resize: true});
    //r.update({drag: editMode, resize: editMode});
    var r2 = wavesurfer2.addRegion({ start: s, end: e, data:{ label:jsonRegionArray[2]}, color: regionColors['candidate'],  drag: false, resize: false});
    
    if (jsonRegionArray[2] == 'positive' || jsonRegionArray[2] == 'negative'){
        r.update({color:regionColors[jsonRegionArray[2]]})
        r2.update({color:regionColors[jsonRegionArray[2]]})
    }
    regions.push(r);

    //commented out when you are ok with regions overlapped
    CheckRegionIntersections(r);
}

function updatePastRegions(){
    past_regions = [];

    for (var i =0; i < regions.length ; i++){

        past_regions.push({start: regions[i].start,
                    end: regions[i].end,
                    data:regions[i].data,
                    id: regions[i].id,
                    drag:true, resize:true});
    }
}

function genLabeledList(){


    var sel = document.getElementById("labeledList");

    while (sel.firstChild) {
        sel.removeChild(sel.firstChild);
    }

    var counter = 0
        
    for (var i=0; i<regions.length;i++){
        if (regions[i].data.label == 'positive'){
            var sel = document.getElementById("labeledList");
            var option = document.createElement("option");
            var start = Math.round(regions[i].start*10)/10;
            var end = Math.round(regions[i].end*10)/10;
            var timeInfo = start.toString()+ ' - ' + end.toString()+' sec';

            option.text = '- Positive #'+(counter+1).toString() + ' (' + timeInfo + ')';
            //option.text = '- Positive #'+(i+1).toString();

            option.value = i;
            option.style.backgroundColor = "rgba(0, 0, 0, 0.0)"
            sel.add(option);
            counter+=1

        }
    }
}

function genListOfMachineSuggestion(){
    
    if(isInitial == true){

        for (var i=0; i<numOfNeighbors; i++){
            var sel = document.getElementById("neighborsSelect");
            var option = document.createElement("option");
            var start = Math.round(relevent_regions[i].start*10)/10;
            var end = Math.round(relevent_regions[i].end*10)/10;
            var timeInfo = start.toString()+'s' + ' - ' + end.toString()+'s';


            //option.text = '- Region #'+(i+1).toString() + ' (' + timeInfo + ')';
            option.text = '- Region #'+(i+1).toString() + ' (NEW)';
            
            option.value = i;
            option.style.backgroundColor = "rgba(0, 0, 0, 0.0)"
            sel.add(option);      
        }

    }else{
        for (var i=0; i<numOfNeighbors; i++){
            var sel = document.getElementById("neighborsSelect");
            var start = Math.round(relevent_regions[i].start*10)/10;
            var end = Math.round(relevent_regions[i].end*10)/10;
            var timeInfo = start.toString()+'s' + ' - ' + end.toString()+'s';
            //var option_text = '- Region #'+(i+1).toString() + ' (' + timeInfo + ')';
            var option_text = '- Region #'+(i+1).toString() + ' (NEW)';
            sel.options[i+1].text = option_text;
        }

    }        
}


// listen to machine's suggestions by clicking an item in 'Listen and Label These'
function playSuggestedRegions(){
    var val = $('#neighborsSelect').val()
    ////console.log('val')
    ////console.log(val)
    
    wavesurfer.seekAndCenter(relevent_regions[val].start/wavesurfer.getDuration())
    playAudio(val);


    editAnnotation(relevent_regions[val]);

    // for (var i =0 ; i < regions.length ; i++){
    //     if (regions[val].id == regions[i].id){
    //         currentRegIndex = i;
    //     }
    // }
    setSelection(relevent_regions[val].data.label);

    ////console.log($('#neighborsSelect option:selected').text())
    var text = $('#neighborsSelect option:selected')[0].text
    ////console.log(text)
    $('#neighborsSelect option:selected')[0].text = text.replace('(NEW)', '')

}

function playLabeledRegions(){
    var val = $('#labeledList').val()
    playRegionByButtonInLabeledList(val);
    editAnnotation(regions[val]);
    setSelection(regions[val].data.label);
}

function playRegionByButtonInLabeledList(num){

    var len = relevent_regions.length;
    selectedRegion = regions[num]
    // for (var i =0 ; i<len ; i++){
    //     if (regions[i].data.label == num){
    //         selectedRegion = relevent_regions[i]
    //         hightlightLabels(selectedRegion);                
    //         }
    //     }
    

    if (wavesurfer.isPlaying() == false)
    {

        //hightlightLabels(selectedRegion)
        wavesurfer.seekAndCenter(selectedRegion.start/wavesurfer.getDuration())
        
        var idGen = "#playButton_"+num.toString();
        $(idGen+" span").removeClass("glyphicon-play").addClass("glyphicon-pause");

    //    //console.log("LOOOOP?")
    //    //console.log(selectedRegion)
        //selectedRegion.play();
        wavesurfer.play(selectedRegion.start, selectedRegion.end);
        wavesurfer2.play(selectedRegion.start, selectedRegion.end);

        isPlaying = true;
        whichPlaying = num;
        
    }
    else
    {
        if (whichPlaying == num) {

            var idGen = "#playButton_"+num.toString();
        
            $(idGen+" span").removeClass("glyphicon-pause").addClass("glyphicon-play");

            wavesurfer.pause();
            wavesurfer2.pause();
            
            isPlaying = false;
        }
        else {
            //console.log("change previous")
            var idGen = "#playButton_"+whichPlaying.toString();
            $(idGen+" span").removeClass("glyphicon-pause").addClass("glyphicon-play");
            
            //console.log("change now")
            idGen = "#playButton_"+num.toString();
            $(idGen+" span").removeClass("glyphicon-play").addClass("glyphicon-pause");
            
            //selectedRegion.play();
            wavesurfer.play(selectedRegion.start, selectedRegion.end);
            wavesurfer2.play(selectedRegion.start, selectedRegion.end);

            isPlaying=true;
            whichPlaying = num;
        }        
    }
}

var whichPlaying = -1;
function playRegionByButton(num){

    var len = relevent_regions.length;
    selectedRegion = relevent_regions[num]
    // for (var i =0 ; i<len ; i++){
    //     if (regions[i].data.label == num){
    //         selectedRegion = relevent_regions[i]
    //         hightlightLabels(selectedRegion);                
    //         }
    //     }
    

    if (wavesurfer.isPlaying() == false)
    {

        //hightlightLabels(selectedRegion)
        wavesurfer.seekAndCenter(selectedRegion.start/wavesurfer.getDuration())
        
        var idGen = "#playButton_"+num.toString();
        $(idGen+" span").removeClass("glyphicon-play").addClass("glyphicon-pause");

    //    //console.log("LOOOOP?")
    //    //console.log(selectedRegion)
        wavesurfer.play(selectedRegion.start, selectedRegion.end);
        wavesurfer2.play(selectedRegion.start, selectedRegion.end);

        isPlaying = true;
        whichPlaying = num;
        
    }
    else
    {
        if (whichPlaying == num) {

            var idGen = "#playButton_"+num.toString();
        
            $(idGen+" span").removeClass("glyphicon-pause").addClass("glyphicon-play");

            wavesurfer.pause();
            wavesurfer2.pause();

            isPlaying = false;
        }
        else {
            //console.log("change previous")
            var idGen = "#playButton_"+whichPlaying.toString();
            $(idGen+" span").removeClass("glyphicon-pause").addClass("glyphicon-play");
            
            //console.log("change now")
            idGen = "#playButton_"+num.toString();
            $(idGen+" span").removeClass("glyphicon-play").addClass("glyphicon-pause");
            
            //selectedRegion.play();
            wavesurfer.play(selectedRegion.start, selectedRegion.end);
            wavesurfer2.play(selectedRegion.start, selectedRegion.end);


            isPlaying=true;
            whichPlaying = num;
        }
                
    }
 
}


function sortRegions(){

    var len = regions.length;
    var startTimes = []
    for (var i =0 ; i<len ; i++){
        startTimes.push(regions[i].start)
        
    }
    startTimes.sort(function (a, b) { return a-b;})
    //console.log(startTimes)
    var temp = []

    startTimes = jQuery.unique(startTimes) //For when two regions are at the same location after clicking "partiallly positive"
    for (var i = 0 ; i<startTimes.length;i++){
        for (var j = 0 ; j < len ; j++){
            if (startTimes[i] == regions[j].start){
               // //console.log(startTimes[i])
               // //console.log(regions[j].start)
                temp.push(regions[j])
            }

        }
        
    }
    //console.log('temp')
    regions = temp
}

function sortRegions_relevent(){

    var len = relevent_regions.length;
    var startTimes = []
    for (var i =0 ; i<len ; i++){
        startTimes.push(relevent_regions[i].start)
        
    }
    startTimes.sort(function (a, b) { return a-b;})
    //console.log(startTimes)
    var temp = []

    startTimes = jQuery.unique(startTimes) //For when two regions are at the same location after clicking "partiallly positive"
    for (var i = 0 ; i<startTimes.length;i++){
        for (var j = 0 ; j < len ; j++){
            if (startTimes[i] == relevent_regions[j].start){
               // //console.log(startTimes[i])
               // //console.log(regions[j].start)
                temp.push(relevent_regions[j])
            }

        }
        
    }
    relevent_regions = temp
}

// Click "positive"
function labelingPos(){

    if (selectedRegion.data.label!='positive'){

        selectedRegion.update({data: {label: 'positive'}, color: regionColors['positive']});
        updateAllRegions();
        setSelection('positive')

        for (var i=0; i < relevent_regions.length ; i++ ){

            if (selectedRegion == relevent_regions[i]){
                var text = $('#neighborsSelect')[0].options[i+1].text
                if (text.substring(13,16)!='neg'){
                    $('#neighborsSelect')[0].options[i+1].text = text + ' (positive)'
                }else{
                    $('#neighborsSelect')[0].options[i+1].text = text.replace(' (negative)',' (positive)');
                }
                // //console.log($('#neighborsSelect')[0].options[i+1].text)
            }
        }
    }
}

// Click "Negative"
function labelingNeg(){

    if (selectedRegion.data.label!='negative'){

        selectedRegion.update({data: {label: 'negative'}, color: regionColors['negative']});
        updateAllRegions();
        setSelection('positive')

        for (var i=0; i < relevent_regions.length ; i++ ){

            if (selectedRegion == relevent_regions[i]){
                var text = $('#neighborsSelect')[0].options[i+1].text
                if (text.substring(13,16)!='pos'){
                    $('#neighborsSelect')[0].options[i+1].text = text + ' (negative)'
                }else{
                    $('#neighborsSelect')[0].options[i+1].text = text.replace(' (positive)',' (negative)');
                }
                // //console.log($('#neighborsSelect')[0].options[i+1].text)
            }
        }
    }
}


function undoPos(){
    if (selectedRegion.data.label=='positive'){
        selectedRegion.update({data: {label: 'candidate'}, color: regionColors['candidate']});
        updateAllRegions();
        setSelection('candidate')
        logToServer('undoPos')

        for (var i=0; i < relevent_regions.length ; i++ ){

            if (selectedRegion == relevent_regions[i]){
                var text = $('#neighborsSelect')[0].options[i+1].text

                $('#neighborsSelect')[0].options[i+1].text = text.replace(' (Labeled)','');
                // //console.log($('#neighborsSelect')[0].options[i+1].text)
            }
        
        }
    }
}

function setSelection(valueToSelect){
    //console.log(valueToSelect)
    if (valueToSelect == 'positive'){

        document.getElementById("selectedRegion_value").innerHTML = "<b><i>Positive</i></b>"

    }else if(valueToSelect == "negative"){
        document.getElementById("selectedRegion_value").innerHTML = "<b><i>Negative</i></b>"

    }else{
         document.getElementById("selectedRegion_value").innerHTML = "<b><i>Unknown </i></b>"
    }
    
}

function addingRegion(reg_start, reg_end, reg_label){

    if((reg_end-reg_start) >= 0.1){
         wavesurfer.addRegion({start: reg_start, end: reg_end, color: regionColors[reg_label] , drag: true, resize: true, data:{label:reg_label}});
         wavesurfer2.addRegion({start: reg_start, end: reg_end, color: regionColors[reg_label] , drag: true, resize: true, data:{label:reg_label}});
     }
 }
 
 function automaticLabeling() {
     if (regions.length == past_regions.length){
         for (var i = 0; i < regions.length; i++) {
             if(regions[i].data.label=='positive' && regions[i].id == past_regions[i].id){
                 if((regions[i].start == past_regions[i].start) && (regions[i].end == past_regions[i].end)){
                     // no update
                     ////console.log('no update')           
                 }else if((regions[i].end <= past_regions[i].start) || (regions[i].start >= past_regions[i].end)){
                     ////console.log('no overlapped')
                     addingRegion(past_regions[i].start, past_regions[i].end, 'negative')
 
                 }else if((regions[i].end >= past_regions[i].start) && (regions[i].end <= past_regions[i].end)){
                     if(regions[i].start <= past_regions[i].start){
                         ////console.log('patially overlapped from the left side')
                         addingRegion(regions[i].end, past_regions[i].end, 'negative')
                     }else{
                         ////console.log('fully overlapped and got smaller')
                         addingRegion(past_regions[i].start, regions[i].start, 'negative')
                         addingRegion(regions[i].end, past_regions[i].end, 'negative')
 
                     }
                 }else if((regions[i].start >= past_regions[i].start) && (regions[i].start <= past_regions[i].end)){
                     if(regions[i].end >= past_regions[i].end){
                         ////console.log('patially overlapped from the right side')
                         addingRegion(past_regions[i].start, regions[i].start, 'negative')
                     }else{
                         //console.log('fully overlapped and got smaller')
                         addingRegion(past_regions[i].start, regions[i].start, 'negative')
                         addingRegion(regions[i].end, past_regions[i].end, 'negative')
                     }
                 }else if((regions[i].start <= past_regions[i].start) && (past_regions[i].end <= regions[i].end)){
                      ////console.log('fully overlapped and got bigger')
                 }
             }
         }
 
         updateAllRegions();
     }
 }

 function downloadCSV(){

    var positiveRegions = []
    for (var i=0; i<regions.length;i++){
        if (regions[i].data.label == 'positive'){
            positiveRegions.push(regions[i])
        }
    }


    var myData = RegionsToJSON(positiveRegions);
    var fileName = 'positive_labels'

    var outputFile = []

    //form.elements.labelName.value = Math.round(region.start * 10) / 10;
    var labelName = $("#labelName").val()
    for(var i =0 ; i< Object.keys(myData).length ; i++){
        outputFile.push({"Index":i+1, "Start":myData[i][0], "End":myData[i][1], "Label":labelName})
    }
    //console.log(outputFile)
    JSONToCSVConvertor(outputFile, fileName, true) 

}

