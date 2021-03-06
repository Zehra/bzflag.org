(function () {
    // Build the search index with the `SearchIndex` global array defined in `/search/index.js`
    const idx = new FlexSearch({
        doc: {
            id: 'id',
            field: [
                'title',
                'content'
            ]
        }
    });
    idx.add(SearchIndex);

    const originalTitle = document.title;
    const srTemplate = document.getElementById('search-result').content;

    if (!srTemplate) {
        console.error('Search result template was not found on this page.');
        return;
    }

    /**
     * A search result.
     *
     * @constructor
     *
     * @param {Object} result The search index item that was matched
     * @param {string[]} keywords An array of keywords that were searched for
     */
    const SearchResult = function (result, keywords) {
        if (typeof result === 'undefined' || !result.id) {
            this.valid = false;
            return;
        }

        this.id = result.id;
        this.valid = true;
        this.keywords = keywords;
        this.document = SearchIndex[this.id];

        /**
         * Wrap the keywords inside of a string with a prefix and suffix.
         *
         * @param {string} string The string to search in to wrap keywords
         * @param {string[]} keywords The keywords that we'll be wrapping
         *
         * @returns {string}
         */
        this.wrapKeywords = function(string, keywords) {
            for (let i = 0; i < keywords.length; i++) {
                keywords[i] = keywords[i].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            }

            const regexpStr = '(' + keywords.join('|') + ')';
            const regex = new RegExp(regexpStr, 'gi');
            return string.replace(regex, '<span>$1</span>');
        };

        /**
         * Filter the description of search results to only include sentences that contain the found keywords.
         *
         * @param {string} string
         *
         * @returns {string}
         */
        this.formatDescription = function(string) {
            const output = [];

            let content = this.wrapKeywords(string, this.keywords);
            let sentences = content.split(/\.\s+?/);

            for (let i = 0; i < sentences.length; i++) {
                const sentence = sentences[i];

                if (sentence.indexOf('<span>') >= 0) {
                    output.push(sentence);
                }
            }

            return output.join('. ');
        };
    };

    /**
     * Create a node for this search result.
     *
     * @returns {Node}
     */
    SearchResult.prototype.makeNode = function () {
        const node = srTemplate.cloneNode(true);

        // Set up the link for the search result
        const link = node.querySelector('.c-search-result__title a');
        link.setAttribute('href', this.document.permalink);
        link.innerHTML = this.wrapKeywords(this.document.title, this.keywords);

        // Document description
        const desc = node.querySelector('.c-search-result__description');
        desc.innerHTML = this.formatDescription(this.document.content);

        // Show the document permalink
        const permalink = node.querySelector('.c-search-result__permalink');
        permalink.innerText = this.document.permalink;

        return node;
    };

    // UI functionality

    /**
     * Get a parameter from the query string.
     *
     * @param {string} name The name of the parameter
     * @param {string} [url] The URL to parse
     *
     * @see https://stackoverflow.com/a/901144/1239484
     *
     * @returns {string|null} Empty string or null when parameter doesn't exist
     */
    function getParameterByName(name, url) {
        if (!url) {
            url = window.location.href;
        }

        name = name.replace(/[\[\]]/g, '\\$&');

        const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);

        if (!results) {
            return null;
        }

        if (!results[2]) {
            return '';
        }

        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }


    /**
     * Clear search results.
     *
     */
    function clearResults() {
        searchResults.innerHTML = '';
    }

    /**
     * Load search results into the dom.
     *
     * @param {string} query
     */
    function performSearch(query) {
        clearResults();

        const noResultsFound = document.getElementById('no-results');
        const landingContent = document.getElementById('landing-content');

        if (!query) {
            noResultsFound.classList.add('d-none');
            landingContent.classList.remove('d-none');

            return;
        }

        landingContent.classList.add('d-none');

        const results = idx.search(query, 10);

        if (results.length > 0) {
            noResultsFound.classList.add('d-none');

            const keywords = query.split(/\W+/);

            for (let i = 0; i < results.length; i++) {
                const result = new SearchResult(results[i], keywords);

                if (!result.valid) {
                    continue;
                }

                searchResults.appendChild(result.makeNode());
            }
        } else {
            noResultsFound.classList.remove('d-none');

            // We <3 our GitHub overlords
            // https://help.github.com/articles/about-automation-for-issues-and-pull-requests-with-query-parameters/
            const ghParams = new URLSearchParams({
                title: 'Feedback on searching for "' + query + '"',
                template: 'feedback_search_template.md'
            });

            const url = 'https://github.com/' + SITE_GH_REPO + '/issues/new?' + ghParams.toString();
            const feedbackURL = document.getElementById('gh-feedback');

            feedbackURL.setAttribute('href', url);
        }
    }

    const searchResults = document.getElementById('search-results');
    const searchForm = document.getElementById('search-field');

    function getTitle(query) {
        if (query) {
            return 'Search - ' + query + ' - BZFlag';
        }

        return originalTitle;
    }

    function setTitle(title) {
        document.title = title;
    }

    function pushHistory(query) {
        const title = getTitle(query);

        history.pushState({}, title, '/search/' + ((query.length) ? '?query=' + encodeURIComponent(query) : ''));
        setTitle(title);
    }

    let pushHistoryTimeout;
    searchForm.addEventListener('input', function (e) {
        const query = e.currentTarget.value.trim();

        performSearch(query);

        clearTimeout(pushHistoryTimeout);
        pushHistoryTimeout = setTimeout(pushHistory, 500, query);
    });

    function pullFromQueryString() {
        const query = getParameterByName('query');

        setTitle(getTitle(query));

        if (query) {
            searchForm.value = query.trim();
            performSearch(searchForm.value);
        }
        else {
            performSearch('');
        }
    }

    window.addEventListener('load', pullFromQueryString);
    window.addEventListener('popstate', pullFromQueryString);
})();
