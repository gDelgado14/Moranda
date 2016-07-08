'use strict'

function Utils () {

    let utils = {}

    /**
     * find if is part of array
     * 
     * @param {String} id
     * @param {Array} members
     * @returns {bool} true if is member of array, false otherwise
     */
    utils.findIfIsMember = function findIfMemberOf (id, members) {
        let m
        let found = false
        for (m = 0; m < members.length; m++) {
            if (id === channelList[c].members[u]) {
                found = true
                break
            } 
        }

        // if by the end of iterating the entire list of users we havent found
        // our bot, then the bot is not within the channel and we return the 
        // channel id from which the bot is missing 
        if (!found) {
          return channelList[c].id
        }   
    }

    return utils

}



        
        
        

module.exports = Utils()