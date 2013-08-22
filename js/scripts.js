// Constructor

/*
	@PARAM: argObject (object)
		properties: 
		{
		'editorId': editor instance container id string,
		'onClickGetLinks': callback for when user clicks 'add link','
		onClickSave': callback for when user clicks 'save essay'
		}


*/

var simpleTextEditor = function(argObject){
	"use strict";

	var innerRef = {
		
		$editorInstance : $('#' + argObject.editorId),
		onClickGetLinks : argObject.onClickGetLinks,
		onClickSave : argObject.onClickSave,
		savedLinks : [],
		bracketReplaceRegex : /(\[__[a-zA-Z0-9,\.\[\]\{\}\!\?\\\/@#\$5\^7\*\(\)\-_\=\+\;\:"'\\<\>\ ]+?__\])/gi,
		openLinkRegex : /\[__/gi,
		closeLinkRegex : /__\]/gi, 
		replaceCount : 0,
		linebreakRegex : /[\r\n]+/gi,
		preventPaste : false,
		currentSelection : {},
		
		selectText : function(textarea,startPos,endPos){
			// Chrome / Firefox
			if(typeof(textarea.selectionStart) !== "undefined") {
				textarea.focus();
				textarea.selectionStart = startPos;
				textarea.selectionEnd = endPos;
			}
			// IE
			if (document.selection && document.selection.createRange) {
				textarea.focus();
				textarea.select();
				var range = document.selection.createRange();
				range.collapse(true);
				range.moveEnd("character", endPos);
				range.moveStart("character", startPos);
				range.select();
			}
		},
		
		addLinkToArray : function(method,link,index) {
			// index is only needed for array insertion
			if(method === 'push'){
				this.savedLinks.push(link);
			}
			else if(method === 'unshift'){
				this.savedLinks.unshift(link);
			}
			else if(method === 'insert'){
				this.savedLinks.splice(index,0,link);
			}
		},
		
		linkArrayPosition : function(){
			var output = 0,
				count = this.currentSelection[1]+2,
				searchText = this.$editorInstance.find('.editor').val().slice(0,count);	
			var regexOutput = searchText.match(this.openLinkRegex);
			if(regexOutput){
				output = regexOutput.length;
			}
			return output;
		},
		
		showExistingLinkTools : function(){
			var linkId = this.linkArrayPosition();
			if(linkId > 0){
				var link = this.savedLinks[linkId-1];
				// in the next line, we clone the <a> node temporarily, so we can html() the whole link
				// then use text to replace the link text
				if(link){
					var linkHtml = $('<div>').append($(link).clone()).remove().html();
					var prevLinkId = this.$editorInstance.find('.action-view-link').attr('id');
					var prevLinkClass = this.$editorInstance.find('.action-view-link').attr('class');
					var titleText = $(linkHtml).attr('title');
					if(!titleText){
						titleText = ''
					}
					var newTitle = 'Go to: ' + titleText + ' [' + $(linkHtml).attr('href') + ']';
					this.$editorInstance.find('.action-view-link').replaceWith(
						$(link).addClass(prevLinkClass).attr('id',prevLinkId).css('display','').attr('title',newTitle).text('View Link')
					);
					this.$editorInstance.find('.action-del-link').attr('data-link-id',linkId-1).show();
				}
			}
		},
		
		getSelected : function() {
			var $editor = this.$editorInstance.find('.editor');
			var u		= $editor.val();
			var start	= $editor.get(0).selectionStart;
			var end		= $editor.get(0).selectionEnd;
			return [start, end, u.substring(start, end)];
		},
		
		selectInEditor : function(){
			this.currentSelection = this.getSelected();
			if(this.selectionIsWithinLink()) {
				this.showExistingLinkTools();
			}
			else if(this.currentSelection[2].length > 0){
				this.$editorInstance.find('.action-set-link').removeAttr('disabled');
			} else {
				this.$editorInstance.find('.action-set-link').attr('disabled','true');
			}
		},
		
		selectionIsWithinLink : function(){
			var selection = this.currentSelection
			var output = false,
				count = selection[1],
				searchText = this.$editorInstance.find('.editor').val(),
				selectionType = 'point';

			if(selection[2] !== ''){
				selectionType = 'range';	
			}

			for(count;count>=0;count--){
				if(searchText.charAt(count) === ']'){
					if(searchText.charAt(count-1) === '_' && searchText.charAt(count-2) === '_' && selectionType === 'point' && count < selection[0]){
						// this means we're beyond a closing tag
						break;
					} 
					else if(searchText.charAt(count-1) === '_' && searchText.charAt(count-2) === '_' && selectionType === 'range' && count >= selection[0] && count <= selection[1]){
						output = true;
						break;
					}
				}
				
				if(searchText.charAt(count) === '_'){
					if(searchText.charAt(count-1) === '_' && searchText.charAt(count-2) === '[' && selectionType === 'point'){
						output = true;
						break;
					}
					// if(searchText.charAt(count-1) === '_' && searchText.charAt(count-2) === '[' && selectionType === 'range'){
						// output = true;
						// break;
					// }
					if(searchText.charAt(count-1) === '[' && searchText.charAt(count+1) === '_' && selectionType === 'point'){
						output = true;
						break;
					}
					if(searchText.charAt(count-1) === '_' && searchText.charAt(count-2) === '[' && selectionType === 'range' && count >= selection[0] && count <= selection[1]){
						output = true;
						break;
					}
					if(searchText.charAt(count-1) === '[' && searchText.charAt(count+1) === '_' && selectionType === 'range' && count >= selection[0] && count <= selection[1]){
						output = true;
						break;
					}
				}
			}
			if(output){
				this.preventPaste = true;
			}
			return output;
		},
		
		prepareLinkSelector : function() {
			if(this.currentSelection[2].length > 0){
				this.$editorInstance.find('.action-set-link').attr('disabled','true');
				//this.selectText(this.$editorInstance.find('.editor').get(0),this.currentSelection[0],this.currentSelection[1]);
				this.onClickGetLinks(this.$editorInstance);
			}
		},
		
		setLink : function(link){
			if(this.currentSelection[2].length > 0){
				// in the next line, we clone the <a> node temporarily, so we can html() the whole link
				// then use text to replace the link text
				link = $('<div>').append($(link).clone().text(this.currentSelection[2])).remove().html();
				var textareaContent = this.$editorInstance.find('.editor').val();
				var priorLinks = this.linkArrayPosition(this.currentSelection);
				if(priorLinks === 0){
					this.addLinkToArray('unshift',link);
				}
				else if(priorLinks === this.savedLinks.length){
					this.addLinkToArray('push',link);
				}
				else {
					this.addLinkToArray('insert',link,priorLinks);
				}
				
				var output = [textareaContent.slice(0,this.currentSelection[0]),'[__',this.currentSelection[2],'__]',textareaContent.slice(this.currentSelection[1])].join('');
				this.$editorInstance.find('.editor').val(output);
				this.$editorInstance.find('.action-set-link').attr('disabled','true');
				this.$editorInstance.find('.action-del-link').attr('data-link-id',this.savedLinks.length);
				var editor = this.$editorInstance.find('.editor').get(0);
				editor.selectionStart = editor.selectionEnd = -1;
				this.resetEditor();
			}
		},
		
		deleteLink : function($target){
			var count = 0,
				linkCount = 0,
				searchText = this.$editorInstance.find('.editor').val(),
				searchTextLength = searchText.length,
				targetId = parseInt($target.attr('data-link-id'),10);

			for(count; count<searchTextLength; count++){
				if(searchText.charAt(count) === '[' && searchText.charAt(count+1) === '_' && searchText.charAt(count+2) === '_'){
					var bracket1 = count;
					var bracket2 = count+1;
					if(linkCount === targetId){
						for(count; count<searchTextLength; count++){
							if(searchText.charAt(count) === '_' && searchText.charAt(count+1) === '_' && searchText.charAt(count+2) === ']'){
								searchText = searchText.slice(0,bracket1) + searchText.slice((bracket2+2),count) + searchText.slice(count+3);
								this.$editorInstance.find('.editor').val(searchText);
								this.resetEditor();
								break;
							}
						}
						this.savedLinks.splice(targetId,1);
						break;
					} 
					linkCount++;
				}
			}
		},
		
		replaceIncomingLinks : function(html){
			var $output = $(html);
			$output.find('a').each(function(){
				// in the next line, we clone the <a> node temporarily, so we can html() the whole link
				var anchorString = $('<div>').append($(this).clone()).remove().html();
				innerRef.addLinkToArray('push',anchorString);
				var linkText = '[__' + $(this).text() + '__]';
				$(this).text(linkText);
			});
			return $output;
		},
		
		loadEditorContent : function(content){
			if(!content){
				return false;
			}
			var $newContent = $(this.replaceIncomingLinks(content));
			this.$editorInstance.find('.editor').val($newContent.text());
			return true;
		},
		
		replaceBrackets : function(match){
			var bracketsRemoved = match.slice(3,-3);
			var $linkUrl = $(innerRef.savedLinks[innerRef.replaceCount]);
			innerRef.replaceCount++;
			$linkUrl.text(bracketsRemoved);
			// in the next line, we clone the <a> node temporarily, so we can html() the whole link
			var anchorString = $('<div>').append($linkUrl.clone()).remove().html();
			return anchorString;
		},
		
		// this returns an html string with only the following elements: anchor,paragraph
		// the entire string is wrapped in a p tag, and linebreaks are converted to a close para - open para
		saveEditorContents : function(){
			this.replaceCount = 0;
			var rawContent = this.$editorInstance.find('.editor').val().trim();
			var replacedLinks = rawContent.replace(this.bracketReplaceRegex,this.replaceBrackets);
			var replacedContent = replacedLinks.replace(this.linebreakRegex,'</p><p>');
			this.resetEditor();
			return replacedContent;
		},
		
		resetEditor : function(){
			//var editor = this.$editorInstance.find('.editor').get(0);
			//editor.selectionStart = editor.selectionEnd = -1;
			//this.currentSelection = {};
			this.$editorInstance.find('.action-set-link').attr('disabled','true');
			$('.action-view-link').removeAttr('data-link-location').attr('title','').hide();
			$('.action-del-link').removeAttr('data-link-id').hide();
		},
		
		resetAllEditors : function(){
			//this.currentSelection = {};
			$('.action-set-link').attr('disabled','true');
			$('.action-view-link').removeAttr('data-link-location').attr('title','').hide();
			$('.action-del-link').removeAttr('data-link-id').hide();
		},
		
		showWarning : function(message){
			this.$editorInstance.find('#messages').hide();
			this.$editorInstance.find('#messages').text(message).css('padding','6px').fadeIn('fast').delay(4000).fadeOut('slow').css('padding','');
		},
		
		inspectPaste : function(priorText){
			setTimeout(function(){
				var errorState = false;
				var pastedTextLength = innerRef.$editorInstance.find('.editor').val().length - priorText.length;
				var pasteStop = innerRef.currentSelection[0] + pastedTextLength;
				var pastedText = innerRef.$editorInstance.find('.editor').val().slice(innerRef.currentSelection[0],pasteStop);
				if(pastedText.match(innerRef.openLinkRegex)){
					errorState = true;
				}
				else if(pastedText.match(innerRef.closeLinkRegex)){
					errorState = true;
				}
				else {
					innerRef.resetEditor();
				}
				if(errorState){
					innerRef.showWarning($editorId,'Please remove link formatting characters and retry pasting.');
					innerRef.$editorInstance.find('.editor').val(priorText);
				}
			},10);
		},
		
		init : function($editorInstance){
			
			$editorInstance.on('keypress keydown',function(e){
				var code = (e.keyCode ? e.keyCode : e.which),
					position = $editorInstance.find('.editor').prop("selectionStart"),
					text = '';
					// if(innerRef.preventPaste){
					
						// e.preventDefault;
						// e.returnValue = false;
						// innerRef.showWarning('Please select outside of link');
						// return false;
					// }
				if(code === 95){
					text = $editorInstance.find('.editor').val().toString();
					if(text.charAt(position-1) === '_' && text.charAt(position-2) === '[' ){
						e.preventDefault();
						innerRef.showWarning('Sorry, the sequence "[,_,_" is not permitted. Underscore removed.');
					}

				} 
				else if(code === 93){
					text = $editorInstance.find('.editor').val().toString();
					if(text.charAt(position-1) === '_' && text.charAt(position-2) === '_'){
						e.preventDefault();
						innerRef.showWarning('Sorry, the sequence "_,_,]" is not permitted. Bracket removed.');
					}
				}
				else if(code === 37 || code === 38 || code === 39 || code === 40){
					// TODO: this is buggy, find a better way to capture arrow-based selection
					//innerRef.selectInEditor()
				}				
				else if(code === 8){

					var position = $editorInstance.find('.editor').prop("selectionStart"),
						text = $editorInstance.find('.editor').val().toString(),
						isError = false;
					if(((text.charAt(position-1) === ']' && text.charAt(position-2) === '_' && text.charAt(position-3) === '_') ||
						(text.charAt(position) === ']' && text.charAt(position-1) === '_' && text.charAt(position-2) === '_')  ||
						(text.charAt(position+1) === ']' && text.charAt(position) === '_' && text.charAt(position-1) === '_')) ||
						
						((text.charAt(position-1) === '_' && text.charAt(position-2) === '_' && text.charAt(position-3) === '[') ||
						(text.charAt(position) === '_' && text.charAt(position-1) === '_' && text.charAt(position-2) === '[')  ||
						(text.charAt(position+1) === '_' && text.charAt(position) === '_' && text.charAt(position-1) === '['))){
							
						isError = true
					} 
					else if(innerRef.preventPaste){
					
						isError = true
					}
					if(isError){
						e.preventDefault;
						e.returnValue = false;
						innerRef.showWarning('Please use the remove link button to remove a link');
						return false;
					}
				}				
				else if(code === 46){

					var position = $editorInstance.find('.editor').prop("selectionStart"),
						text = $editorInstance.find('.editor').val().toString(),
						isError = false;
					if(((text.charAt(position) === ']' && text.charAt(position-1) === '_' && text.charAt(position-2) === '_') ||
						(text.charAt(position+1) === ']' && text.charAt(position) === '_' && text.charAt(position-1) === '_')  ||
						(text.charAt(position+2) === ']' && text.charAt(position+1) === '_' && text.charAt(position) === '_')) ||
						
						((text.charAt(position) === '_' && text.charAt(position-1) === '_' && text.charAt(position-2) === '[') ||
						(text.charAt(position) === '_' && text.charAt(position+1) === '_' && text.charAt(position-1) === '[')  ||
						(text.charAt(position+2) === '_' && text.charAt(position+1) === '_' && text.charAt(position) === '['))){
						
						isError = true
					} 
					else if(innerRef.preventPaste){
					
						isError = true
					}
					if(isError){
						e.preventDefault;
						e.returnValue = false;
						innerRef.showWarning('Please use the remove link button to remove a link');
						return false;
					}
				}
				
			});
			
			$editorInstance.on('click','.action-set-link',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.prepareLinkSelector();
			});

			$editorInstance.on('mousedown','.editor',function(){
				innerRef.resetEditor();
				innerRef.preventPaste = false;
			});
			
			$('body').on('mousedown',function(e){
				if(!$(e.target).is('input') && !$(e.target).is('select') && !$(e.target).is('option') && !$(e.target).is('a')){
					//if click registers that is not on a button, reset the editor state
					innerRef.resetAllEditors();
					innerRef.preventPaste = false;
				}
			});
			
			$editorInstance.on('mouseup','.editor',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.selectInEditor();
			});
			
			$editorInstance.on('click','.action-del-link',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.deleteLink($(this));
			});
			
			$editorInstance.on('click','.action-save-essay',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.onClickSave(innerRef.saveEditorContents());
			});
			
			$editorInstance.on('paste cut',function(e){
				if(!innerRef.preventPaste){
					var priorText = innerRef.$editorInstance.find('.editor').val();
					innerRef.inspectPaste(priorText);
				} else {
					e.stopPropagation();
					e.preventDefault();
					innerRef.showWarning('Please select outside of link. Cut/paste is not allowed for current selection');
				}
			});

			
		}
	};
	
	innerRef.init(innerRef.$editorInstance);
	
	// PUBLIC API
	var publicRef = {
		setEditorContent : function(content){
			return innerRef.loadEditorContent(content);
		},
		getEditorContent : function(){
			return innerRef.saveEditorContents();
		},
		showMessage : function(message){
			return innerRef.showWarning(message);
		},
		setLink : function(htmlString){
			// See saveEssay for info about allowable html string
			return innerRef.setLink(htmlString);
		}
		
	};
	return publicRef;
};
