(function (document) {
    var newsList,main,LIMIT,skip;
    var setup = function () {
        newsList = document.getElementById('list');
        main = document.getElementsByTagName('main')[0];
        LIMIT = 30;
        skip = 0;
        
        registerListeners();
        loadList(skip, LIMIT);
    }
    var registerListeners = function () {
        newsList.addEventListener("click", function(e) {
            if (e.target.classList.contains('ae--comments')) {
                var moreButton = document.getElementById('loadNext');
                var limit = moreButton.getAttribute('data-limit');
                var skip = moreButton.getAttribute('data-skip');
                clearControl('loadPrev');
                clearControl('loadCurrent');
                clearControl('loadNext');

                var button = createControl('loadCurrent', "Back");
                main.insertBefore(button, main.firstChild);
                var moreButton = document.getElementById("loadCurrent");
                moreButton.setAttribute('data-skip', parseInt(skip)-LIMIT);
                moreButton.setAttribute('data-limit', parseInt(limit)+LIMIT);
                moreButton.addEventListener('click', function (e) {
                    var limit = e.target.getAttribute('data-limit');
                    var skip = e.target.getAttribute('data-skip');
                    clearListContainer();
                    loadList(parseInt(skip), parseInt(limit));
                })
                loadComments(e.target.dataset.itemid);
            }
        }, false);
    }
    var loadList = function(skip,limit){
        clearListContainer();
        clearControl('loadCurrent');
        var itemcount = 1 + skip;
        
        sendRequest('https://hacker-news.firebaseio.com/v0/topstories.json')
        .then(function(response) {
            var itemIDs = response || [];
            
            // cut the array from offset (0) to limit (30)
            var pageItemIDs = itemIDs.slice(skip, limit);
            var itemUrl = 'https://hacker-news.firebaseio.com/v0/item/';

            // add skeletal
            pageItemIDs.forEach(function () {
                renderSkeletal('list');
            });

            // get items from api
            var items = pageItemIDs.map(function (itemID) {
                return sendRequest(itemUrl + itemID + '.json')
            });

            // render items
            Promise.all(items)
                .then(function (values) {
                    clearListContainer();
                    values.forEach(function (item) {
                        renderItem(item, 'list', itemcount);
                        itemcount++;
                    });
                })
        })
        .catch(function(error) {
            var p = document.createElement('p');
            p.appendChild(
                document.createTextNode('Error: ' + error.message)
            );
            document.body.insertBefore(p, newsList);
        });
        renderControl(skip+LIMIT,limit);
        skip > 0 ? renderControl(skip-LIMIT,limit,true) : clearControl('loadPrev')
    }
    var loadComments = function (itemID) {        
        var itemUrl = 'https://hacker-news.firebaseio.com/v0/item/';

        clearListContainer();

        sendRequest(itemUrl + itemID + '.json')
            .then(function (item) {
                if (item.kids.length > 0) {
                     
                    // add skeletal
                    item.kids.forEach(function () {
                        renderSkeletal('comment');
                    });

                    // get items from api
                    var items = item.kids.map(function (itemID) {
                        return sendRequest(itemUrl + itemID + '.json')
                    });

                     // render items
                    Promise.all(items)
                        .then(function (values) {
                            clearListContainer();
                            renderItem(item, 'comment');
                            values.forEach(function (item) {
                                renderItem(item, 'kids');
                            });
                        })
                }
        })
        
    }
    var clearListContainer = function(){
        newsList.innerHTML = '';
    }
    var getItem = function (itemID, type, counter) {
        var itemUrl = 'https://hacker-news.firebaseio.com/v0/item/';
        var itemType = type || 'list';

        sendRequest(itemUrl + itemID + '.json')
            .then(function (json) {
                return renderItem(json,itemType, counter);
        })
    }
    var renderItem = function(item,itemType,counter){
        switch (itemType) {
            case "list":
            case "comment": {
                return showItem(item, itemType, counter);
            }
            case "kids": {
                return showKid(item, itemType);
            }
            default:
                return;
        }
    }
    var sendRequest = function (url) {
        return fetch(url).then(function(response) {
            if (!response.ok) {
                throw new Error("HTTP error, status = " + response.status);
            }

            return response.json();
        })
    }
    var renderDomain = function (uri) {
        var r = /:\/\/(.[^/]+)/; // match ://, cature group to extract substring (.[^/]+), gets all caracters till /
        var domain = '';

        if (typeof uri !== 'undefined' && uri.length > 0) {
            domain = uri.match(r)[1];
            
            return `<span class="ae ae--domain">(<a href="${getYcombinatorUrl('from')}?site=${domain}">${domain}</a>)</span>`;
        } 

        return '';
    }
    var showItem = function (item, type, counter) {
        var item = item || {};
 
        var listItem = document.createElement('article');
        listItem.className = type === 'comment' ? 'article ae--comment' : 'article';

        // create listcount & upvote
        var listleft = document.createElement('div');
        listleft.className = 'ae__count';
        listleft.innerHTML = `
            ${type === 'list' ? `<span class="counter">${counter}.</span>` : ''}
            <span class="upvote">
                <a href="${getYcombinatorUrl('vote')}?id=${item.id}&how=up&goto=news">&#9650;</a>
            </span>
        `;
        listItem.appendChild(listleft);
        
        // create item content
        var listright = document.createElement('div');

        listright.className = 'ae__content';
        listright.innerHTML = `
            <h2 class="ae ae--title"><a href="${item.url}" target="_blank">${item.title}</a>${renderDomain(item.url)}</h2>
            <span class="ae ae--points">${item.score}${(item.score == 1) ? ' point' : ' points'}</span>
            <span class="ae ae--user">by <a href="${getYcombinatorUrl('user')}?id=${item.by}" target="_blank">${item.by}</a></span>
            <span class="ae ae--time"><a href="${getYcombinatorUrl('item')}?id=${item.by}" target="_blank">${moment(item.time * 1000).fromNow()}</a></span>
            <span class="ae ae--hide"><a href="${getYcombinatorUrl('hide')}?id=${item.by}&goto=news">hide</a></span>
            ${
                (type === 'comment') ? `
                    <span class="ae ae--past"><a href="${getYcombinatorUrl('user')}?id=${item.by}" target="_blank">past</a></span>
                    <span class="ae ae--web"><a href="${getYcombinatorUrl('item')}?id=${item.by}" target="_blank">web</a></span>
                    <span class="ae ae--favorite"><a href="${getYcombinatorUrl('hide')}?id=${item.by}">favorite</a></span>
                `:''
            }
            ${
                (typeof item.descendants !== 'undefined' && item.descendants > 0) ?
                    `<span class="ae ae--comments" data-itemid="${item.id}">
                        ${item.descendants}${(item.descendants == 1) ? ' comment' : ' comments'}
                    </span>` :
                    `<span class="ae ae--comments" data-itemid="${item.id}">
                        be the first to comment
                    </span>`
            }
        `       
        listItem.appendChild(listright);
        
        if (type === 'comment') {
            clearListContainer();
        }

        // add item to container
        newsList.appendChild(listItem);

        if (type === 'comment') {
            var commentform = document.createElement('div');

            commentform.className = 'comment';
            commentform.innerHTML =`
                <form method="post" action="comment">
                    <textarea name="text" rows="6" cols="60"></textarea>
                    <br><br>
                    <input type="submit" value="add comment">
                </form>
            `;
            
            // add commnetform to container
            newsList.appendChild(commentform);

            // disabled for now
            // if (item.kids.length > 0) {
            //     getKids( item.kids );
            // }
        }
    }
    var renderSkeletal = function (type) {
        var listItem = document.createElement('article');
         listItem.className = type === 'comment' ? 'article ae--comment skeletal' : 'article skeletal';
        newsList.appendChild(listItem);
    }
    var getKids = function (kidsIds) {
        kidsIds.forEach( function( itemID ) {
            getItem( itemID, 'kids' );
        });
    }
    var showKid = function (item) {       
        if (typeof item === 'undefined' || typeof item.deleted != 'undefined') {
            return;
        }  

        var item = item || {};
        var kidItem = document.createElement('div');
        kidItem.className = `comment ${(typeof item.kids !== 'undefined' && item.kids.length > 0) ? 'haskids' : ''}`;

        // create listcount & upvote
        var kidleft = document.createElement('div');
        kidleft.className = 'kid__count';
        kidleft.innerHTML =`
            <span class="upvote">
                <a href="${getYcombinatorUrl('vote')}?id=${item.id}&how=up&goto=news">&#9650;</a>
            </span>`;
        kidItem.appendChild(kidleft);
        
        // create kid content
        var kidright = document.createElement('div');
        kidright.className = 'kid__content';
        kidright.innerHTML = `
            <span class="kid kid--user">
                <a href="${getYcombinatorUrl('user')}?id=${item.by}" target="_blank">${item.by}</a>
            </span>
            <span class=kid kid--time">
                <a href="${getYcombinatorUrl('item')}?id=${item.id}" target="_blank">${moment(item.time * 1000).fromNow()}</a> [-]
            </span>
            <br>
            <div class="kid kid--text">${item.text}</div>
            <span class="kid kid--comments">${typeof item.kids !== 'undefined' && item.kids.length > 0 ? `${item.kids.length} more ${item.kids.length === 1 ? 'comment' : 'comments'}`: ''}</span>
        `;
        kidItem.appendChild(kidright);

        // add item to container
        newsList.appendChild(kidItem);

        // disabled for now
        // if (typeof item.kids !== 'undefined' && item.kids.length > 0) {
        //     getKids( item.kids, );
        // }
    }
    var getYcombinatorUrl = function (endpoint) {
        return `https://news.ycombinator.com/${endpoint}`;
    }
    var clearControl = function (id) {
        var button = document.getElementById(id)
        button && button.remove();
    }
    var createControl = function (id,label) {
        var button = document.createElement('button');
        button.type = "button";
        button.id = id;
        button.className = "more";
        button.textContent = label;
        return button;
    }
    var renderControl = function (skip, limit, isPrev) {
        var moreButton = document.getElementById(isPrev ? 'loadPrev' : 'loadNext');
        if (!moreButton) {
            var button = createControl(
                isPrev ? 'loadPrev' : 'loadNext',
                isPrev ? "Prev" : "Next"
            );
            if (isPrev) {
                main.insertBefore(button, main.firstChild);
            } else {
                main.appendChild(button);
            }
            var moreButton = document.getElementById(isPrev ? 'loadPrev' : 'loadNext');
            moreButton.addEventListener('click', function (e) {
                var limit = e.target.getAttribute('data-limit');
                var skip = e.target.getAttribute('data-skip');
                loadList(parseInt(skip), !isPrev ? parseInt(limit)+parseInt(LIMIT) : parseInt(limit)-parseInt(LIMIT));
            })
        }
        moreButton = document.getElementById(isPrev ? 'loadPrev' : 'loadNext');
        moreButton.setAttribute('data-skip', skip);
        moreButton.setAttribute('data-limit', limit);
    }

    // start
    window.addEventListener("DOMContentLoaded",setup);
    
}(document))