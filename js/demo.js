

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
var myEditor1 = new simpleTextEditor({'editorId':'textEditor1','onClickGetLinks':onClickGetLinks,'onClickSave':onClickSave});
var myEditor2 = new simpleTextEditor({'editorId':'textEditor2','onClickGetLinks':onClickGetLinks,'onClickSave':onClickSave});



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
