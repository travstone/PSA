// Constructor
var simpleTextEditor = function($editorId,getLinksCallBack,setLinkCallback){
"use strict";
	var innerRef = {
		
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
		
		getSelected : function($eventCaller) {
			var u		= $eventCaller.val();
			var start	= $eventCaller.get(0).selectionStart;
			var end	= $eventCaller.get(0).selectionEnd;
			//return [u.substring(0, start), u.substring(end), u.substring(start, end)];
			return [start, end, u.substring(start, end)];
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
		
		linkArrayPosition : function(selection,$editorId){
			var output = 0,
				count = selection[1]+2,
				searchText = $editorId.find('.editor').val().slice(0,count);	
			var regexOutput = searchText.match(this.openLinkRegex);
			if(regexOutput){
				output = regexOutput.length;
			}
			return output;
		},
		
		showExistingLinkTools : function($editorId){
			var linkId = this.linkArrayPosition(this.currentSelection,$editorId);
			if(linkId > 0){
				//this.showExistingLinkTools(linkId-1,$editorId);
				var link = this.savedLinks[linkId-1];
				$editorId.find('.action-view-link').attr('data-link-location',link).attr('title',link).show();
				$editorId.find('.action-del-link').attr('data-link-id',linkId).show();
			}
		},
		
		selectInEditor : function($eventCaller,$editorId){
			this.currentSelection = this.getSelected($eventCaller);
			if(this.selectionIsWithinLink(this.currentSelection,$editorId)) {
				this.showExistingLinkTools($editorId);
			}
			else if(this.currentSelection[2].length > 0){
				$editorId.find('.action-set-link').removeAttr('disabled');
			} else {
				$editorId.find('.action-set-link').attr('disabled','true');
			}
		},
		
		selectionIsWithinLink : function(selection,$editorId){
			var output = false,
				count = selection[1],
				searchText = $editorId.find('.editor').val(),
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
		
		prepareLinkSelector : function($editorId) { // $eventCaller,
			if(this.currentSelection[2].length > 0){
				$editorId.find('.action-set-link').attr('disabled','true');
				this.selectText($editorId.find('.editor').get(0),this.currentSelection[0],this.currentSelection[1]);
				publicRef.getLinksMenu($editorId);
			}
		},
		
		setLink : function($editorId,link){ // $eventCaller,
			//var linkSelected = $editorId.find('.url-list').val();
			var linkSelected = link;

			if(this.currentSelection[2].length > 0){
				var textareaContent = $editorId.find('.editor').val();
				var priorLinks = this.linkArrayPosition(this.currentSelection,$editorId);
				if(priorLinks === 0){
					this.addLinkToArray('unshift',linkSelected);
				}
				else if(priorLinks === this.savedLinks.length){
					this.addLinkToArray('push',linkSelected);
				}
				else {
					this.addLinkToArray('insert',linkSelected,priorLinks);
				}
				
				var output = [textareaContent.slice(0,this.currentSelection[0]),'[__',this.currentSelection[2],'__]',textareaContent.slice(this.currentSelection[1])].join('');
				$editorId.find('.editor').val(output);
				$editorId.find('.action-set-link').attr('disabled','true');
				$editorId.find('.action-del-link').attr('data-link-id',this.savedLinks.length);
				//$editorId.find('.linkEntry').slideToggle('fast').delay(2000);//.css('display','none');
				//this.selectText($editorId.find('.editor').get(0),this.currentSelection[0]+3,this.currentSelection[1]+3);
				this.resetEditor($editorId);
			}
		},
		
		deleteLink : function($target,$editorId){
			var count = 0,
				linkCount = 0,
				searchText = $editorId.find('.editor').val(),
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
								$editorId.find('.editor').val(searchText);
								this.resetEditor($editorId);
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
		
		loadEditorContent : function($editorId,content){
			if(!content){
				return false;
			}
			var $newContent = $(this.replaceIncomingLinks(content));
			$editorId.find('.editor').val($newContent.text());
			return true;
		},
		
		replaceBrackets : function(match){
			var bracketsRemoved = match.slice(3,-3);
			var $linkUrl = $(innerRef.savedLinks[innerRef.replaceCount]);
			innerRef.replaceCount++;
			$linkUrl.text(bracketsRemoved);
			var anchorString = $('<div>').append($linkUrl.clone()).remove().html();
			return anchorString;
		},
		
		saveEditorContents : function($editorId){
			this.replaceCount = 0;
			var rawContent = $editorId.find('.editor').val().trim();
			var replacedLinks = rawContent.replace(this.bracketReplaceRegex,this.replaceBrackets);
			var replacedContent = replacedLinks.replace(this.linebreakRegex,'</p><p>');
			var markupDisplay = replacedContent.replace(/&/g, '&amp;').replace(/</g, '&lt;');
			$editorId.find('.pre').html("<pre>&lt;p>" + markupDisplay + "&lt;/p></pre>");
			$editorId.find('.output').html('<p>' + replacedContent + '</p>');
			$editorId.find('.results').slideDown();
			return replacedContent;
		},
		
		resetEditor : function($editorId){
			this.currentSelection = {};
			$editorId.find('.action-set-link').attr('disabled','true');
			$('.action-view-link').removeAttr('data-link-location').attr('title','').hide();
			$('.action-del-link').removeAttr('data-link-id').hide();
		},
		
		resetAllEditors : function(){
			this.currentSelection = {};
			$('.action-set-link').attr('disabled','true');
			$('.action-view-link').removeAttr('data-link-location').attr('title','').hide();
			$('.action-del-link').removeAttr('data-link-id').hide();
		},
		
		showWarning : function($editorId,message){
			$editorId.find('#messages').hide();
			$editorId.find('#messages').text(message).css('padding','6px').slideToggle('fast').delay(4000).slideToggle('slow').css('padding','');
		},
		
		inspectPaste : function($editorId, priorText){
			setTimeout(function(){
				var errorState = false;
				var pastedTextLength = $editorId.find('.editor').val().length - priorText.length;
				var pasteStop = innerRef.currentSelection[0] + pastedTextLength;
				var pastedText = $editorId.find('.editor').val().slice(innerRef.currentSelection[0],pasteStop);
				if(pastedText.match(innerRef.openLinkRegex)){
					errorState = true;
				}
				else if(pastedText.match(innerRef.closeLinkRegex)){
					errorState = true;
				}
				if(errorState){
					innerRef.showWarning($editorId,'Please remove link formatting characters and retry pasting.');
					$editorId.find('.editor').val(priorText);
				}
			},10);
		},
		
		init : (function(){
			
			$editorId.on('keypress keydown',function(e){
				var code = (e.keyCode ? e.keyCode : e.which),
					position = $editorId.find('.editor').prop("selectionStart"),
					text = '';
				if(code === 95){
					text = $editorId.find('.editor').val().toString();
					if(text.charAt(position-1) === '_' && text.charAt(position-2) === '[' ){
					e.preventDefault();
					innerRef.showWarning($editorId,'Sorry, the sequence "[,_,_" is not permitted. Underscore removed.');
					}

				} 
				else if(code === 93){
					text = $editorId.find('.editor').val().toString();
					if(text.charAt(position-1) === '_' && text.charAt(position-2) === '_'){
					e.preventDefault();
					innerRef.showWarning($editorId,'Sorry, the sequence "_,_,]" is not permitted. Bracket removed.');
					}
				}
				else if(code === 37 || code === 38 || code === 39 || code === 40){
					// TODO: this is buggy, find a better way to capture arrow-based selection
					//innerRef.selectInEditor($(this).find('.editor'),$editorId)
				}
			});
			
			$editorId.on('click','.action-set-link',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.prepareLinkSelector($editorId);
			});

			$editorId.on('mousedown','.editor',function(){
				innerRef.resetEditor($editorId);
				innerRef.preventPaste = false;
			});
			
			$('body').on('mousedown',function(e){
				if(!$(e.target).is('input') && !$(e.target).is('select') && !$(e.target).is('option')){
					// if click registers that is not on a button, reset the editor state
					innerRef.resetAllEditors();
					innerRef.preventPaste = false;
				}
			});
			
			$editorId.on('mouseup','.editor',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.selectInEditor($(this),$editorId);
			});
			
			$editorId.on('change','select',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.setLink($(this),$editorId);
			});
			
			$editorId.on('click','.action-view-link',function(e){
				e.stopPropagation();
				e.preventDefault();
				window.open($(this).attr('data-link-location'),'Artifact');
			});
			
			$editorId.on('click','.action-del-link',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.deleteLink($(this),$editorId);
			});
			
			$editorId.on('click','.action-save-essay',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.saveEditorContents($editorId);
			});
			
			$editorId.on('paste',function(e){
				if(!innerRef.preventPaste){
					var priorText = $editorId.find('.editor').val();
					innerRef.inspectPaste($editorId,priorText);
				} else {
					e.stopPropagation();
					e.preventDefault();
					innerRef.showWarning($editorId,'Sorry, paste is not permitted when selection overlaps a link');
				}
			});

			
		})($editorId) // self-executing init
	};
	
	// PUBLIC API
	var publicRef = {
		loadEssay : function(content){
			return innerRef.loadEditorContent($editorId,content);
		},
		saveEssay : function(){
			return innerRef.saveEditorContents($editorId);
		},
		showMessage : function(message){
			return innerRef.showWarning($editorId,message);
		},
		getLinksCallBack : function($editor){
			// Call out to link pop-up code with jquery-wrapped editor ID
			showLinkSelector($editor);
		},
		setLinkCallback : function($editor,link){
			// callback from link chosen
			//hideLinkSelector($editorRef);
			return innerRef.setLink($editor,link);

		},
		savedLinks : innerRef.savedLinks
		
	};
	return publicRef;
};

// Example instantiations
var myEditor1 = new simpleTextEditor($('#textEditor1'));
var myEditor2 = new simpleTextEditor($('#textEditor2'));