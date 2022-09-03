//var wavesurfer_modal = Object.create(WaveSurfer);
var wavesurfer_modal
document.addEventListener('DOMContentLoaded', function () {
	var options_modal = {
        container: document.querySelector('#waveform_modal'),
        waveColor: 'gray',
        progressColor: 'purple',
        cursorColor: 'navy',
        scrollParent: true, 
        height: 70,
        plugins: [
            WaveSurfer.timeline.create({
                container: '#wave-timeline_modal'
            }),
            WaveSurfer.regions.create({
            })
        ]

    };

 // Init
    wavesurfer_modal = WaveSurfer.create(options_modal);

    wavesurfer_modal.enableDragSelection({
        color: regionColors['positive']
    })

    wavesurfer_modal.on('region-update-end', function (reg) {

        for (var key in wavesurfer_modal.regions.list){
                tempRegion = wavesurfer_modal.regions.list[key]
            }
    
    });

    wavesurfer_modal.on('loading', function (e) {
        document.getElementById("instruction_modal").innerHTML = "<strong>Downloading audio file...("+e+" / 100)"+"</strong>";
    });
    
    wavesurfer_modal.on('ready', function (e) {
        document.getElementById("instruction_modal").innerHTML = "<strong>Succefully loaded</strong>";
    });

});

// wavesurfer_modal.on('ready', function () {

//     var timeline = Object.create(WaveSurfer.Timeline);

//     timeline.init({
//         wavesurfer: wavesurfer_modal,
//         container: "#wave-timeline_modal"
//     });
// });


function playAudio_modal(){

    if (tempRegion!=null){
            wavesurfer_modal.play(tempRegion.start, tempRegion.end);

        }else{
            wavesurfer_modal.play();
            isPlaying = true;
        }
}

function stopPlaying_modal(){

    wavesurfer_modal.pause();
    isPlaying = false;
}


function loadPreset_initTarget(){

    var filePath = '../uploads/'+g_preLoadedFilename_target

    wavesurfer_modal.load(filePath);
    run_modal_preloaded(g_preLoadedFilename_target)

}

function run_modal_preloaded(fileName){

    $.get('/run_modal', {'name': fileName},
            function (data, textStatus, jqXHR) {
            $("#browseButton").removeClass("disabled");
            $('#browseButton').prop('disabled', false);

        document.getElementById("selectedRegionForm").style.opacity = 1;
        ToggleEditMode()
    });
}

function findInitQuery(){

    document.getElementById("Instructions").innerHTML = "<font size='+2'><strong>Please wait...</strong></font>";
    document.getElementById("Instructions").className = "alert alert-danger";
    $('#initSubmitButton').remove();
    
    tempRegion.update({data: {label: 'positive'}, color: instColors['positive']});

    regions = []
    for (var key in wavesurfer_modal.regions.list){
        regions.push(wavesurfer_modal.regions.list[key])
    }

    var myData = RegionsToJSON(regions);

    var fd = new FormData();
    fd.append('init_region', JSON.stringify(myData));
    
    initialQuery = RegionsToJSON(regions);

    $.ajax({
        type: "POST",
        url: '/submitCorrections_initQuery',
        data: fd,
        processData:false,
        contentType:false,
        method: "POST"
    }).done(function(msg){

            serverData = JSON.parse(msg);
            document.getElementById("Instructions").innerHTML = "<font size='+2'><strong>Please wait...</strong></font>";
            document.getElementById("Instructions").className = "alert alert-danger";

            console.log('serverData');
            console.log(serverData);
            
            startOver();

            updateAllRegions();
            updatePastRegions();

            genLabeledList();
            genListOfMachineSuggestion();

            //initialUpdateRegions();
            ////console.log("regison update done")

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
            $('#submitButton').prop('disabled', false);
            $('#noButton').prop('disabled', false);
            $('#yesButton').prop('disabled', false);

            document.getElementById("regionSelection").style.opacity = 1;
            isInitial = false;

            document.getElementById("labeledRegionDiv").style.opacity = 1;
            document.getElementById("labeledRegions").style.opacity = 1;

            // $.get('/updateToFront',
            // function (data, textStatus, jqXHR) {
              
            // });

            $.get('/submitCorrections',

                function (data, textStatus, jqXHR) {
                  //  //console.log("done");
                    //console.log('test')
                    //console.log(data)
                    var confidence = JSON.parse(data);
                    //console.log(confidence['confidence'])
                    $('#confidence').val(confidence['confidence'])
                });

            if (iteration>=1){
                $.get('/updateGraph',
                function (data, textStatus, jqXHR){
            //    //console.log('updateGraph')
                serverData_graph = JSON.parse(data);
                updateGraph();

                });

            }
            iteration +=1;            
        })
}