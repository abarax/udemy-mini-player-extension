var checkUrl = function (details) {
    //Show the image in the address bar

    if (/http(s)?:\/\/(www.)?udemy.com\/.*\/learn\//.test(details.url)) {
        chrome.pageAction.show(details.tabId);
    } else {
        chrome.pageAction.hide(details.tabId);
    }
};


///* run */
chrome.pageAction.onClicked.addListener(function (tab) {
    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
        var url = tabs[0].url;

        chrome.tabs.sendMessage(tab.id, {text: 'report_back'}, function(dom) {

        var myRegexp = /course_id=([0-9]+)/;
        var course_id = myRegexp.exec(dom)[1];

            chrome.cookies.getAll({}, function(cookies) {
                var access_token;
                for (var i = 0; i<cookies.length; i++) {
                    if (cookies[i].name == 'access_token') {
                        access_token = cookies[i].value;
                    }
                }

                udemyAPIRequest('https://www.udemy.com/api-2.0/courses/'+ course_id + '/subscriber-curriculum-items?fields%5Blecture%5D=title,object_index,content_summary,embed_url&page_size=9999', access_token, function(lectures) {
                    if (/http(s)?:\/\/(www.)?udemy.com\/.*\/learn\/#\/?$/.test(url)) {
                        //Course Description Page
                        udemyAPIRequest('https://www.udemy.com/api-2.0/users/me/subscribed-courses/' + course_id + '/progress?fields%5Basset%5D=asset_type,remaining&fields%5Blecture%5D=asset,last_watched_second,title,url&fields%5Bquiz%5D=title,url', access_token, function(progressResponse) {

                            var progressJson = JSON.parse( progressResponse );
                            var lecture_id = progressJson.next_curriculum_object.id;
                            var watched_lectures = progressJson.completed_lecture_ids;
                            var json_lectures = JSON.parse(lectures).results;
                            var embed_url;

                            for (var i = 0; i < json_lectures.length; i++) {
                                if (json_lectures[i].id == lecture_id) {
                                    embed_url = json_lectures[i].embed_url;
                                    break;
                                }
                            }
                            launchMiniPlayer(cookies, lectures, watched_lectures, 'https://udemy.com' + embed_url);

                        });
                    } else if (/http(s)?:\/\/(www.)?udemy.com\/.*\/learn\/#\/lecture/.test(url)) {
                        //Lecture Page
                        var lectureRegex = /lecture\/([0-9]*)/
                        var lecture_id = lectureRegex.exec(url)[1];
                        udemyAPIRequest('https://www.udemy.com/api-2.0/users/me/subscribed-courses/' + course_id + '/progress?fields%5Basset%5D=asset_type,remaining&fields%5Blecture%5D=asset,last_watched_second,title,url&fields%5Bquiz%5D=title,url', access_token, function(progressResponse) {
                            var json = JSON.parse( progressResponse );
                            var watched_lectures = json.completed_lecture_ids;
                            var json_lectures = JSON.parse(lectures).results;
                            var embed_url;

                            for (var i = 0; i < json_lectures.length; i++) {
                                if (json_lectures[i].id == lecture_id) {
                                    embed_url = json_lectures[i].embed_url;
                                    break;
                                }
                            }
                            launchMiniPlayer(cookies, lectures, watched_lectures, 'https://udemy.com' + embed_url);
                        });
                    }
                });
            });
        });

    });



});

function udemyAPIRequest(theUrl, udemyAccessToken, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.setRequestHeader("X-Udemy-Authorization", 'Bearer ' + udemyAccessToken);
    xmlHttp.send(null);
}


function launchMiniPlayer(cookies, lectures, watched_lectures, url) {
    chrome.runtime.sendMessage('dllcgdlgepbhnpgphognhiafbnnbopfm', {
        type: 'launch',
        cookies: cookies,
        lectures: lectures,
        watched_lectures: watched_lectures,
        url: url
    }, function(response) {
        if (!response) {
            alert("This extension requires the 'Udemy Mini Player' to be installed.");
        }
    });
}

/* show icon if right url appears */
chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    checkUrl(details);
});

// onDOMContentLoaded - other cases
chrome.webNavigation.onDOMContentLoaded.addListener(function (details) {
    if (details.frameId === 0) {
        checkUrl(details);
    }
});
