'use strict';

const Alexa = require('alexa-sdk');
const request = require('request-promise');

const APP_ID = '<ApplicationId>';


// --------------- GOT API ------------------------

/**
 * Generic function to call api with url (no business here)
 * @param {string} url url of the API
 */
var queryApi = function(url) {
	return new Promise((resolve, reject) => {
		var options = {
    		uri: encodeURI(url),
    		json: true
    	};
		request(options)
		.then(function(result) {
			resolve(result);
		})
		.catch(function (err) {
        	reject(err);
    	});
    });
}

// --------------- util methods ---------------------

/**
 * Search for allegiance and query API to retrieve house details
 * @param {string} character 
 */
var retrieveHouse = function(character) {	
	return new Promise((resolve, reject) => {
		if (character["allegiances"] && character["allegiances"].length > 0) {
			queryApi(character["allegiances"][0])
			.then(function(houseFound) {
				resolve(houseFound);
			})
			.catch(function (err) {
				reject(err);
			});
		} else {
			reject(new Error('no allegiances'));
		}
	});
}

/**
 * Recursive function to retrieve father (or grand-father...) house
 * @param {string} initialCharacter the one we want to know
 * @param {string} character his ascendant
 * @param {handler} handler 
 */
var retrieveHouseOrFatherHouse = function(initialCharacter, character, handler) {
	retrieveHouse(character)
		.then(function(house) {
			handler.emit(':ask', initialCharacter.name + ' is from ' + house.name + ', its motto is \''+house.words+'\'', 'Do you want to bend the knee?');
		})
		.catch(function(err) {
			if (err.message == 'no allegiances') {
				queryApi(character["father"])
				.then(function(characterFound) {
					retrieveHouseOrFatherHouse(initialCharacter, characterFound, handler);
				})
				.catch(function (err) {
					// TODO : No father
				});
			} else {
				handler.emit(':ask', 'I could not find his allegiance', 'Have you got another question?');
			}
		});
}

// --------------- handlers -----------------------

var handlers = {
	/**
	 *  Intent to handle such questions :
     *    "who is his {familymemberslot}"
	 *    {familymemberslot} can be either father, mother or spouse
	 */
	'FamilyIntent' : function () {
		var familymemberslot = this.event.request.intent.slots.familymemberslot;
		var _this = this;
		var character = _this.attributes['character'];
		if (!character) {
			// TODO : error
			return;
		}
		if (familymemberslot && familymemberslot.value) {
			var familymember = familymemberslot.value;
			
			if (character[familymember]) {
				queryApi(character[familymember])
					.then(function(characterFound) {
						var subjet = ((character.gender == "Male") ? 'His ' : 'Her ');
						var familySubject = ((familymember == "spouse") ? ((character.gender == "Male") ? 'wife' : 'husband') : familymember );
						var repromptSpeech = (familymember == "spouse") 
											? 'Would you like some more information (parents, house, nickname)?' 
											: 'Any other information (spouse, house, nickname)?'
						_this.emit(':ask', subjet + familySubject + ' is ' + characterFound.name, repromptSpeech);
					})
					.catch(function (err) {
						_this.emit(':ask', 'I could not find his parent', 'Can you repeat your question?');
					});
			}
		}
	},

	/**
	 * Intent to handle the initial question : 'Who is {characterslot}'
	 */
	'WhoIsIntent' : function () {
		var characterSlot = this.event.request.intent.slots.characterslot;
		var _this = this;
		if (characterSlot && characterSlot.value) {
			queryApi('https://anapioficeandfire.com/api/characters?name=' + characterSlot.value)
				.then(function(characterFound) {
					var character = characterFound[0];
					_this.attributes['character'] = character;
					_this.response.speak(character.name + ' is a '+ character.gender + ' born ' + character.born)
									.listen('Do you want more information (parents, house, nickname)?');
					_this.emit(':responseReady');
				})
				.catch(function (err) {
					_this.attributes['character'] = null;
					_this.emit(':ask', 'I could not find any character with that name, can you say it again?', 'Can you repeat your question?');
				});
		}
		
	},

	/**
	 * Intent to handle such question :
	 * 		'Does he have a nickname'
	 * or	'What is his pseudo'
	 */
	'NicknameIntent' : function () {
		var character = this.attributes['character'];
		if (!character) {
			// TODO : error
			return;
		}
		var message;
		if (character["aliases"]) {			
			if (character["aliases"].length > 1) {
				message = character.name + ' has several nicknames, the most famous is \'' + character["aliases"][0] + '\'';
			} else if (character["aliases"].length == 1) {
				message = character.name + ' is nicknamed \'' + character["aliases"][0] + '\'';
			} else {
				message = character.name + ' has no alias';
			}
		} else {
			message = character.name + " has no alias";
		}
		this.emit(':ask', message, 'Do you want to know more about '+ character.name +'?');
	},

	/**
	 * Intent to handle such question:
	 * 		'did he pledge allegiance'
	 * or	'from which house'
	 */
	'HouseIntent' : function () {
		var character = this.attributes['character'];
		if (!character) {
			// TODO : error
			return;
		}
		retrieveHouseOrFatherHouse(character, character, this);
	},
	'LaunchRequest': function () {
        this.emit(':ask', 'Welcome to the Game Of Thrones skill', 'Ask me what do you want to know about any character');
    },
    'AMAZON.HelpIntent': function () {
        this.emit(':ask', 'You can ask me who is Jon Snow, who is his father, does he have a nickname', '');
    },
    'SessionEndedRequest': function () {
		this.attributes['character'] = null;
        this.emit(':tell', 'Bye bye');
    }
};

exports.handler = function (event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
