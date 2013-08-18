// js


var textEditorInstance = function($editor){

	var innerRef = {
		
		savedLinks : [],
		tempString : '',
		linkRegex : /\<a href\="([a-zA-Z0-9\:\/\.]+)"\>([a-zA-Z0-9\:\/\.]+)\<\/a\>/gi,
		linkReplaceRegex : /(\[\[[a-zA-Z0-9,\.\[\]\{\}\!\?\\\/@#\$5\^7\*\9\0\-_\=\+\;\:"'\<\>\ ]+?\]\])/gi,
		openLinkRegex : /\[\[/gi,
		closeLinkRegex : /\]\]/gi,
		replaceCount : 0,
		linebreakRegex : /[\r\n]+/gi,
		
		selectText : function(textarea,startPos,endPos){
			// Chrome / Firefox
			if(typeof(textarea.selectionStart) != "undefined") {
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
		
		getSelected : function(editor) {
		  var u     = editor.val();
		  var start = editor.get(0).selectionStart;
		  var end   = editor.get(0).selectionEnd;
		  //return [u.substring(0, start), u.substring(end), u.substring(start, end)];
		  return [start, end, u.substring(start, end)];
		},
		
		prepareLinkSelector : function($eventCaller,$editor) {
			var $context = $eventCaller.parents('form').first();
			if(innerRef.tempString[2].length > 0){
				$context.find('.linkEntry').slideToggle('fast').css('display','');
				$context.find('.action-set-link').attr('disabled','true');
				innerRef.selectText($context.find('.editor').get(0),innerRef.tempString[0],innerRef.tempString[1]);
			}
		},
		
		setLink : function($eventCaller,$editor){
			var linkSelected = $editor.find('.url-list').val();
			var $context = $eventCaller.parents('form').first();
				
			if(innerRef.tempString[2].length > 0){
				innerRef.savedLinks.push({'url':linkSelected});
				var textareaContent = $context.find('.editor').val();
				var output = [textareaContent.slice(0,innerRef.tempString[0]),'[[',innerRef.tempString[2],']]',textareaContent.slice(innerRef.tempString[1])].join('');
				$context.find('.editor').val(output);
				$context.find('.action-set-link').attr('disabled','true');
				$context.find('.action-del-link').attr('data-link-id',innerRef.savedLinks.length);
				$context.find('.linkEntry').slideToggle('fast').delay(2000);//.css('display','none');
				
				innerRef.selectText($context.find('.editor').get(0),innerRef.tempString[0]+2,innerRef.tempString[1]+2);
				innerRef.resetEditor($editor);
			}
		},
		
		selectionIsWithinLink : function(selection,$editor){
			var output = false,
				count = selection[1],
				searchText = $editor.find('textarea').val(),
				selectionType = 'point';

			if(selection[2] !== ''){
				selectionType = 'range';
				
			}

			for(count;count>=0;count--){
				if(searchText.charAt(count) === ']'){
					if(searchText.charAt(count-1) === ']' && selectionType === 'point' && count < selection[0]){
						// this means we're beyond a closing tag
						break;
					} 
					else if(searchText.charAt(count-1) === ']' && selectionType === 'range' && count >= selection[0] && count <= selection[1]){
						output = true;
						break;
					}
				}
				
				if(searchText.charAt(count) === '['){
					if(searchText.charAt(count-1) === '[' && selectionType === 'point'){
						output = true;
						break;
					}
					if(searchText.charAt(count-1) === '[' && selectionType === 'range' && count >= selection[0] && count <= selection[1]){
						output = true;
						break;
					}
				}
			}

			return output;
		},
		
		
		deleteLink : function($target,$editor){
			var count = 0,
				linkCount = 0,
				searchText = $editor.find('textarea').val(),
				searchTextLength = searchText.length,
				targetId = parseInt($target.attr('data-link-id'));

			for(count; count<searchTextLength; count++){
				if(searchText.charAt(count) === '[' && searchText.charAt(count+1) === '['){
					var bracket1 = count;
					var bracket2 = count+1;
					if(linkCount === targetId){
						for(count; count<searchTextLength; count++){
							if(searchText.charAt(count) === ']' && searchText.charAt(count+1) === ']'){
								searchText = searchText.slice(0,bracket1) + searchText.slice((bracket2+1),count) + searchText.slice(count+2);
								$editor.find('textarea').val(searchText);
								innerRef.resetEditor($editor);
								break;
							}
						}
						innerRef.savedLinks.splice(targetId,1);
						break;
					} 
					linkCount++;
				}
			}
		},
		
		showExistingLinkTools : function(linkId,$editor){
			var link = innerRef.savedLinks[linkId].url;
			$editor.find('.action-view-link').attr('data-link-location',link).attr('title',link).show();
			$editor.find('.action-del-link').attr('data-link-id',linkId).show();
		},
		
		linkArrayPosition : function(selection,$editor){
			var output = null,
				count = selection[1]+1,
				searchText = $editor.find('textarea').val().slice(0,count);
			output = searchText.match(innerRef.openLinkRegex).length;
			return output;
		},
		
		selectInEditor : function($eventCaller,$editor){
			var $context = $eventCaller.parents('form').first();
			var selectedText = this.getSelected($eventCaller);
			if(innerRef.selectionIsWithinLink(selectedText,$editor)) {
				var linkId = innerRef.linkArrayPosition(selectedText,$editor);
				innerRef.showExistingLinkTools(linkId-1,$editor);
			}
			else if(selectedText[2].length > 0){
				$context.find('.action-set-link').removeAttr('disabled').css('display','');
				innerRef.tempString = selectedText;
			} else {
				$context.find('.action-set-link').attr('disabled','true').css('display','none');
				innerRef.tempString = '';
			};
		},
		
		recordLinkInArray : function(match, p1, p2, offset, string){
			innerRef.savedLinks.push({'url':p1});
			return '[[' + p2 + ']]';
		},
		
		replaceLinks : function(html){
			var replacedHtml = html.replace(innerRef.linkRegex,innerRef.recordLinkInArray);
			return replacedHtml;
		},
		
		replaceBrackets : function(match, p1, offset, string){
			var bracketsRemoved = match.slice(2,-2);
			var linkUrl = innerRef.savedLinks[innerRef.replaceCount].url;
			var linkStart = '<a href="';
			var linkMid = '">';
			var linkEnd = '</a>';
			innerRef.replaceCount++;
			return linkStart + linkUrl + linkMid + bracketsRemoved + linkEnd;
		},
		
		saveEditorContents : function($editor){
			innerRef.replaceCount = 0;
			var rawContent = $editor.find('textarea').val().trim();
			var replacedLinks = rawContent.replace(innerRef.linkReplaceRegex,innerRef.replaceBrackets);
			var replacedContent = replacedLinks.replace(innerRef.linebreakRegex,'</p><p>');
			var markupDisplay = replacedContent.replace(/&/g, '&amp;').replace(/</g, '&lt;');
			$editor.find('.pre').html("<pre>&lt;p>" + markupDisplay + "&lt;/p></pre>");
			$editor.find('.output').html('<p>' + replacedContent + '</p>');
			$editor.find('.results').slideDown();
		},
		
		resetEditor : function($editor){
			innerRef.tempString = '';
			$editor.find('.action-set-link').attr('disabled','true').css('display','none');
			$('.action-view-link').removeAttr('data-link-location').attr('title','').hide();
			$('.action-del-link').removeAttr('data-link-id').hide();
		},
		
		resetAll : function(){
			innerRef.tempString = '';
			$('.action-set-link').attr('disabled','true').css('display','none');
			$('.action-view-link').removeAttr('data-link-location').attr('title','').hide();
			$('.action-del-link').removeAttr('data-link-id').hide();
		},
		
		showWarning : function(message){
			$('#messages').hide();
			$('#messages').text(message).slideToggle('fast').delay(4000).slideToggle('slow');
		},
		
		init : (function(){
			
			$editor.on('keypress',function(e){
				var code = (e.keyCode ? e.keyCode : e.which);
				var position = $editor.find('textarea').prop("selectionStart");
				if(code === 91){
					var text = $editor.find('textarea').val().toString();
					if(text.charAt(position-1) === '['){
					e.preventDefault();
					innerRef.showWarning('two opening brackets ([[) cannot be used in sequence');
					}
				} else if(code === 93 ){
					var text = $editor.find('textarea').val().toString();
					if(text.charAt(position-1) === ']'){
					e.preventDefault();
					innerRef.showWarning('two closing brackets (]]) cannot be used in sequence');
					}
				}
			});
			
			$editor.on('click','.action-set-link',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.prepareLinkSelector($(this),$editor);
			});

			$editor.on('mousedown','.editor',function(e){
				innerRef.resetEditor($editor);
			});
			
			$('body').on('mousedown',function(e){
				if($(e.target).is('input') || $(e.target).is('select') || $(e.target).is('option')){
					// do nothing, a button has been clicked
				} else {
					innerRef.resetAll();
				}
			});
			
			$editor.on('mouseup','.editor',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.selectInEditor($(this),$editor);
			});
			
			$editor.on('change','select',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.setLink($(this),$editor);
			});
			
			$editor.on('click','.action-view-link',function(e){
				e.stopPropagation();
				e.preventDefault();
				window.open($(this).attr('data-link-location'),'Artifact');
			});
			
			$editor.on('click','.action-del-link',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.deleteLink($(this),$editor);
			});
			
			$editor.on('click','.action-save-essay',function(e){
				e.stopPropagation();
				e.preventDefault();
				innerRef.saveEditorContents($editor);
			});
			

			
			// the following methods are mostly for the mockup - probably not needed in production
			
			$('#load-dummy-text').on('click',function(e){
				e.stopPropagation();
				e.preventDefault();
				var text = $('#dummy-text').text();
				$('#textarea1').val(text);
				$('.loading-links').hide();
			});
			
			$('#load-dummy-html').on('click',function(e){
				e.stopPropagation();
				e.preventDefault();
				var text = $('#dummy-html').html();
				var $newText = $(innerRef.replaceLinks(text));
				$('#textarea1').val($newText.text());
				$('.loading-links').hide();
			});

			$('#load-dummy-text2').on('click',function(e){
				e.stopPropagation();
				e.preventDefault();
				var text = $('#dummy-text').text();
				$('#textarea2').val(text);
				$('.loading-links2').hide();
			});

			$('#load-dummy-html2').on('click',function(e){
				e.stopPropagation();
				e.preventDefault();
				var text = $('#dummy-html').html();
				var $newText = $(innerRef.replaceLinks(text));
				$('#textarea2').val($newText.text());
				$('.loading-links2').hide();
			});
			
		})($editor)
	}
	return innerRef;
}

var myEditor1 = new textEditorInstance($('#textEditor1'));
var myEditor2 = new textEditorInstance($('#textEditor2'));



