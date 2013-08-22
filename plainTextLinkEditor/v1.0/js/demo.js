/*
	Demo file for plainTextLinkEditorV1.0.js
	
	Call the load method of the component like this to demo:
	
	
	myEditor1.setEditorContent('<p>I answered a similar question a few days ago: <a href="http://stackoverflow.com/questions/3211505/detect-pasted-text-with-ctrlv-or-right-click-paste/3212056#3212056" title="example title">http://stackoverflow.com/questions/3211505/detect-pasted-text-with-ctrlv-or-right-click-paste/3212056#3212056</a>. This time I\'ve included <a href="http://www.example.com/index1.html" title="another sample title">quite a long</a> function that accurately gets selection boundaries in textarea in IE; the rest is relatively simple.</p>')

	based on sample instantiation below 
	
	see simpleTextEditor.js for more on callbacks and methods




*/



// Demo callbacks

var onClickGetLinks = function($editorInstance) {
	$editorInstance.find('.editor').before($linkSelector.clone().slideToggle('fast').css('display',''));
}

var onClickSave = function(htmlString) {
	var markupDisplay = htmlString.replace(/&/g, '&amp;').replace(/</g, '&lt;');
	$('.display-holder').remove();
	$('.editor-instance').first().append($scoreDisplay.clone());
	$('.editor-instance').first().find('.pre').html("<pre>&lt;p>" + markupDisplay + "&lt;/p></pre>");
	$('.editor-instance').first().find('.output').html('<p>' + htmlString + '</p>');
	$('.editor-instance').first().find('.results').slideDown();
}


// Demo link selection handler

$('.editor-instance').on('change','select',function(e){
	e.stopPropagation();
	e.preventDefault();
	var linkChoice = $('.linkEntry .url-list').val();
	var id = $(this).parents('.editor-instance').attr('id');
	if(id === 'textEditor1'){
		myEditor1.setLink(dummyLinksArray[linkChoice]);
	} else if(id === 'textEditor2'){
		myEditor2.setLink(dummyLinksArray[linkChoice]);
	}
	$('.linkEntry').remove();
});


// Example instantiations
var myEditor1 = new plainTextLinkEditor({'editorId':'textEditor1','onClickGetLinks':onClickGetLinks,'onClickSave':onClickSave});
var myEditor2 = new plainTextLinkEditor({'editorId':'textEditor2','onClickGetLinks':onClickGetLinks,'onClickSave':onClickSave});



// Demo html snippets

var dummyLinksArray = [
						'<a href="http://www.example.com/index1.html" title="test1">Sample link text</a>',
						'<a href="http://www.example.com/index2.html" title="test2">Sample link text</a>',
						'<a href="http://www.example.com/index3.html" title="test3">Sample link text</a>',
					]

var $linkSelector = $('<div class="linkEntry" style="display:none">Choose Artifact'+
					'<select class="url-list form-control">'+
						'<option disabled="disabled" selected="selected">Please choose</option>'+
						'<option value="0">http://www.example.com/index1.html</option>'+
						'<option value="1">http://www.example.com/index2.html</option>'+
						'<option value="2">http://www.example.com/index3.html</option>'+
					'</select>'+
				'</div>');


var $scoreDisplay = $('<div class="display-holder"><div class="col-md-6 results"><h3>Markup: </h3><div class="pre"></div></div>'+
					'<div class="col-md-6 results"><h3>Display: </h3><div class="output"></div></div></div>');
