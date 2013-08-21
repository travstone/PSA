


var showLinkSelector = function($editorId){
	console.log($editorId);
	$editorId.find('.linkEntry').slideToggle('fast').css('display','');
}
var hideLinkSelector = function($editorId){
	console.log($editorId);
	$editorId.find('.linkEntry').slideToggle('fast').css('display','none');
}


			
// the following methods are mostly for the mockup - probably not needed in production

$('#load-dummy-text').unbind('click').on('click',function(e){
	e.stopPropagation();
	e.preventDefault();
	var text = $('#dummy-text').text();
	$('#textarea1').val(text);
	$('.loading-links').hide();
});

$('.action-load-html').on('click', function(e){
	e.stopPropagation();
	e.preventDefault();
	var $editor = $(this).parents('.editor-instance');
	var editorId = $editor.attr('id');
	console.log(editorId);
	innerRef.loadEditorContent($editor);
});

$('#load-dummy-text2').unbind('click').on('click',function(e){
	e.stopPropagation();
	e.preventDefault();
	var text = $('#dummy-text').text();
	$('#textarea2').val(text);
	$('.loading-links2').hide();
});










