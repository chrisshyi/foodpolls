let searchTerm = document.getElementById("search-term");
let city = document.getElementById("search-city");
let csrfToken = Cookies.get('csrftoken');
let httpRequest;
let response;
/**
 * Maps the display name of a category (string) to its alias (string, used for Yelp API calls)
 */
let categoryMap = new Map();
let selectedCategories = new Map();

/* Add click event listener for the search button */
document.getElementById("search-btn").addEventListener("click", function() {
    if (searchTerm.value !== "" && city.value !== "") {
        categoryMap.clear();
        selectedCategories.clear();
        makeSearchRequest(searchTerm.value, city.value)
    }
});


/* Add click event listener for the select button in the categories pop-up window */
document.getElementById("select-category-btn").addEventListener("click", function() {
    let checkboxes = document.getElementsByClassName("pop-up-input");
    /* clear the selectedCategories map */
    selectedCategories.clear();
    for (let checkbox of checkboxes) {
        if (checkbox.checked === true) {
            selectedCategories.set(checkbox.value, categoryMap.get(checkbox.value));
        }
    }   
    
    /* Refresh the categories display on the main page */
    let categoriesDiv = document.getElementById("categories-div");
    /* Clear what was in the categories div before */
    categoriesDiv.innerHTML = "";
    generateCategoryFilters(categoriesDiv);
    

    $('#category-modal').modal('toggle');
});


/**
 * Make an AJAX request to the server for restaurant data based on search parameters
 * @param searchTerm: the search term (String)
 * @param city: the city to conduct the search in (String)
 * @param categories: categories to filter the results by (Array of Strings)
 * @param price: price levels  (Array of Strings)
 * @param sortBy: Either 'best_match', 'rating', or 'review_count' (string)
 */
function makeSearchRequest(searchTerm, city, categories="", price="", sortBy="") {
    let searchParams = ["search_term", "city", "categories", "price", "sort_by"];

    let searchData = {
        "search_term": searchTerm,
        "city": city,
        "categories": categories,
        "price": price,
        "sort_by": sortBy,
    };
    /* Remove optional parameters that are empty strings */
    searchParams.forEach(function(param) {
        if (searchData[param] === "") {
            delete searchData[param];
        }
    });
    /*
    ** Clear the business listings in a search had been done previously
     */
    document.getElementById("business_listings").innerHTML = "";
    /* clear the filter and sort by options from the side */
    document.getElementById("price-div").innerHTML = "";
    document.getElementById("categories-div").innerHTML = "";
    document.getElementById("sort-by").innerHTML = "";
    document.getElementById("filter-header").innerText = "";
    document.getElementById("sort-by").innerHTML = "";

    httpRequest = new XMLHttpRequest();
    httpRequest.open('POST', '/search_for_venues', true);
    httpRequest.onreadystatechange = populateWithResponse;
    httpRequest.setRequestHeader('Content-Type', 'application/json');
    httpRequest.setRequestHeader("X-CSRFToken", csrfToken);
    httpRequest.send(JSON.stringify(searchData));
}

/**
 * Populate the web page with search results returned by our server (data from Yelp)
 */
function populateWithResponse() {
    let businessListings = document.getElementById("business_listings");
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 200) {
            response = JSON.parse(httpRequest.responseText);
            for (let i = 0; i < response['businesses'].length; i++) {
                let business = response['businesses'][i];
                businessListings.appendChild(createNewListing(business));
            }
            renderFilterAndSortOptions();
            
        }
        else {
            alert('There was a problem with the request.');
        }
    }
}

/**
 * Returns a new li element with the business's information rendered
 * @param business: a JavaScript object from the businesses array returned by the Yelp API
 */
function createNewListing(business) {
    for (let i = 0; i < business['categories'].length; i++) {
        let category = business['categories'][i];
        categoryMap.set(category['title'], category['alias']);
    }
    let innerHttpRequest;
    /* The list item */
    let newLi = document.createElement("li");
    newLi.classList.add("media", "business-listing");
    /* The image of the restaurant */
    let liImage = document.createElement("img");
    liImage.setAttribute("src", business['image_url']);
    liImage.classList.add("mr-3");
    liImage.setAttribute("height", '200px');
    liImage.setAttribute("width", "200px");
    newLi.appendChild(liImage);
    /* The body of the media listing (Bootstrap) */
    let liBody = document.createElement("div");
    liBody.classList.add("media-body");
    newLi.appendChild(liBody);

    /* The header (restaurant name) */
    let mediaHeader = document.createElement("h5");
    mediaHeader.classList.add("mt-0");
    mediaHeader.classList.add("mb-1");
    /* The category for the venue */
    let subHeader = document.createElement("h6");
    subHeader.classList.add("mt-0");
    subHeader.classList.add("mb-1");
    subHeader.innerText = business['categories'][0]['title'];
    subHeader.classList.add("venue-category");

    let nameLink = document.createElement("a");
    nameLink.textContent = business['name'];
    nameLink.setAttribute("href", business['url']);
    mediaHeader.appendChild(nameLink);
    liBody.appendChild(mediaHeader);
    liBody.appendChild(subHeader);

    /* div containing the rating and price */
    let ratingAndLogo = document.createElement("div");
    ratingAndLogo.classList.add("rating-and-image");
    let innerSpan = document.createElement("span");
    ratingAndLogo.appendChild(innerSpan);

    let reviewCount = document.createElement("p");
    reviewCount.classList.add("review-count");
    reviewCount.innerText = "Based on " + business['review_count'] + " reviews";
    ratingAndLogo.appendChild(reviewCount);

    let yelpStarsImg = document.createElement("img");
    let imgUrl = "";
    imgUrl += "/static/polls/img/yelp/yelp_stars/small/small_";

    yelpStarsImg.setAttribute("class", "yelp-stars");
    innerSpan.appendChild(yelpStarsImg);

    let rating = business['rating'];
    /* Check if the rating is an integer */
    let half = !Number.isInteger(rating);
    rating = Math.floor(rating);
    /*
    ** Generate the img url based on the rating
     */
    imgUrl += rating;
    if (half) {
        imgUrl += "_half"
    }
    imgUrl += "@2x.png";
    yelpStarsImg.setAttribute("src", imgUrl);


    /*
    ** Add the Yelp image logo
     */
    let yelpPageLink = document.createElement("a");  /* anchor that links to the listing's Yelp page */
    yelpPageLink.setAttribute("href", business['url']);
    let yelpLogo = document.createElement("img");
    yelpLogo.classList.add("yelp-logo");
    yelpLogo.setAttribute("src", "/static/polls/img/yelp/Yelp_trademark_RGB.png");
    yelpPageLink.appendChild(yelpLogo);
    innerSpan.appendChild(yelpPageLink);
    /* TODO: Add a "Add to Poll" button for each listing */
    liBody.appendChild(ratingAndLogo);

    /**
     * Gets some reviews for this listing via an AJAX call to the server
     */
    function getReviewRequest() {
        /**
         *  Get three reviews from Yelp using an AJAX call
         */
        let searchData = {
            "business_id": business['id'],
        };

        innerHttpRequest = new XMLHttpRequest();
        innerHttpRequest.open('POST', '/get_reviews', true);
        innerHttpRequest.onreadystatechange = appendReviewsToLi;
        innerHttpRequest.setRequestHeader('Content-Type', 'application/json');
        innerHttpRequest.setRequestHeader("X-CSRFToken", csrfToken);
        innerHttpRequest.send(JSON.stringify(searchData));
    }

    /**
     * Appends reviews to the list item for this listing
     */
    function appendReviewsToLi() {
        /**
         * Append the reviews to the list item representing the business listing
         */
        if (innerHttpRequest.readyState === XMLHttpRequest.DONE) {
            if (innerHttpRequest.status === 200) {
                let innerResponse = JSON.parse(innerHttpRequest.responseText);
                /* Create the reviews div */
                let reviews = document.createElement("ul");
                reviews.setAttribute("id", "reviews_list");
                reviews.classList.add("list-unstyled");

                for (let i = 0; i < 3; i++) {
                    let review = innerResponse['reviews'][i];
                    let reviewEntry = document.createElement("li");
                    reviewEntry.classList.add("media", "review-li");


                    let reviewerImage = document.createElement("img");
                    reviewerImage.classList.add("mr-3", "reviewer-img");
                    let srcUrlList = review['user']['image_url'];
                    reviewerImage.setAttribute("src", srcUrlList);
                    reviewerImage.setAttribute("onerror", "this.src=\'/static/polls/img/assets/person_icon.png\'");
                    reviewEntry.appendChild(reviewerImage);

                    let reviewEntryBody = document.createElement("div");
                    reviewEntryBody.classList.add("media-body", "review-body");
                    reviewEntry.appendChild(reviewEntryBody);

                    // let reviewText = document.createElement("p");
                    let reviewLink = document.createElement("a");
                    reviewLink.classList.add("review-link");
                    reviewLink.innerText = "Read More";
                    reviewLink.setAttribute("href", review['url']);

                    reviewEntryBody.innerText = review['text'];
                    reviewEntryBody.appendChild(reviewLink);
                    reviews.appendChild(reviewEntry);
                }
                liBody.appendChild(reviews);
            }
            else {
                alert('There was a problem with the request.');
            }
        }
    }

    getReviewRequest();

    return newLi;
}

/**
 * Renders a pop up window with category check boxes that the user can use to filter listings
 */
function renderCategoryPopup() {
    let categoryColOne = document.getElementById("category-col-one");
    let categoryColTwo = document.getElementById("category-col-two");

    /* wipe clean the previous records */
    categoryColOne.innerHTML = "";
    categoryColTwo.innerHTML = "";

    let categoryKeyIter = categoryMap.keys();
    let midIndex = Math.floor(categoryMap.size / 2);
    let inputDiv;
    for (let i = 0; i < categoryMap.size; i++) {
        let categoryKey = categoryKeyIter.next().value;
        inputDiv = document.createElement("div");
        inputDiv.classList.add("form-check");

        let inputElem = document.createElement("input");
        inputElem.classList.add("form-check-input", "pop-up-input");
        inputElem.setAttribute("type", "checkbox");
        inputElem.setAttribute("value", categoryKey);
        inputElem.setAttribute("id", "pop-up-check" + i);
        inputElem.value = categoryKey;
        if (selectedCategories.has(categoryKey)) {
            inputElem.checked = true;
        }
        inputDiv.appendChild(inputElem);

        let inputLabel = document.createElement("label");
        inputLabel.classList.add("form-check-label");
        inputLabel.setAttribute("for", "pop-up-check" + i);
        inputLabel.innerText = categoryKey;
        inputDiv.appendChild(inputLabel);

        if (i < midIndex) {
            categoryColOne.appendChild(inputDiv);
        } else {
            categoryColTwo.appendChild(inputDiv);
        }
    }

}

/**
 * Renders the left side-panel displaying filter and sort options
 */
function renderFilterAndSortOptions() {
    let priceDiv = document.getElementById("price-div");
    let categoriesDiv = document.getElementById("categories-div");
    let sortByDiv = document.getElementById("sort-by");
    document.getElementById("filter-header").innerText = "Filters";
    generateCategoryFilters(categoriesDiv);
    generatePriceFilter(priceDiv);
    renderSortByOptions(sortByDiv);
}

/**
 * Render the price range filters on the page
 * @param priceDiv: the Bootstrap column for price filters
 */
function generatePriceFilter(priceDiv) {
    let header = document.createElement("h6");
    header.innerText = "Price";
    priceDiv.appendChild(header);

    let priceForm = document.createElement("form");
    let dollarSigns = "$";
    for (let i = 0; i < 4; i++) {
        let inputDiv = document.createElement("div");
        inputDiv.classList.add("form-check");

        let inputElem = document.createElement("input");
        inputElem.classList.add("form-check-input");
        inputElem.setAttribute("type", "checkbox");
        inputElem.id = "price-check-" + (i + 1);
        inputDiv.appendChild(inputElem);

        let inputLabel = document.createElement("label");
        inputLabel.classList.add("form-check-label");
        inputLabel.setAttribute("for", inputElem.id);
        inputLabel.innerText = dollarSigns;
        inputDiv.appendChild(inputLabel);

        priceForm.appendChild(inputDiv);
        dollarSigns += "$";
    }
    priceDiv.appendChild(priceForm);
}

/**
 * Render the category filter form on the page
 * @param categoryDiv: the div element for the filter form
 */
function generateCategoryFilters(categoryDiv) {
    let header = document.createElement("h6");
    header.innerText = "Categories";
    categoryDiv.appendChild(header);

    let categoryKeyIter = categoryMap.keys();
    let categoryForm = document.createElement("form");
    categoryDiv.appendChild(categoryForm);
    let selectedKeysIter;
    /* 
     * Keep track of what's already rendered to avoid duplicates when 
     * generating items randomly
     */
    let renderedCategories = new Set();
    if (selectedCategories.size > 0) {
        selectedKeysIter = selectedCategories.keys();
    }

    for (let i = 0; i < 4; i++) {
        /* If more than 4 categories exist, render a link */
        if (i === 3 && categoryMap.size > 4) {
            let moreLink = document.createElement("a");
            moreLink.classList.add("more-link");
            moreLink.setAttribute("href", "javascript:;");
            moreLink.innerText = "More Categories";
            moreLink.addEventListener("click", function() {
                renderCategoryPopup();
                $('#category-modal').modal('toggle')
            });
            categoryDiv.appendChild(moreLink);
            break;
        }
        let inputDiv = document.createElement("div");
        inputDiv.classList.add("form-check");

        let inputElem = document.createElement("input");
        inputElem.classList.add("form-check-input");
        inputElem.setAttribute("type", "checkbox");
        inputElem.id = "category-check-" + (i + 1);
        
        let selectedVal;
        let randomCategory;
        if (typeof(selectedKeysIter) !== "undefined") {
            let nextItem = selectedKeysIter.next();
            if (!nextItem.done) {
                selectedVal = nextItem.value;
            }
        }

        if (typeof(selectedVal) !== "undefined") {
            inputElem.value = selectedVal;
            inputElem.checked = true;
        } else {
            do {
                randomCategory = categoryKeyIter.next().value;
            } while (renderedCategories.has(randomCategory));
            inputElem.value = randomCategory;
            inputElem.checked = false;
        }
        renderedCategories.add(inputElem.value);
        inputDiv.appendChild(inputElem);


        let inputLabel = document.createElement("label");
        inputLabel.classList.add("form-check-label");
        inputLabel.setAttribute("for", inputElem.id);
        // PyCharm warning here, ignore
        if (typeof(selectedVal) !== "undefined") {
            inputLabel.innerText = selectedVal;
        } else {
            inputLabel.innerText = randomCategory;
        }
        inputDiv.appendChild(inputLabel);

        categoryForm.appendChild(inputDiv);

    }
}

/**
 * Creates and returns a new DOM element
 * @param {string} type:  the element type (HTML tag)
 * @param {Array} elemClasses: classes for the new element
 * @param {Map} elemAttributes: other attributes 
 * @returns the newly created DOM element
 */
function createNewElement(type, elemClasses=[], elemAttributes=new Map()) {
    let newElement = document.createElement(type);
    if (elemClasses.length !== 0) {
        newElement.classList.add(...elemClasses);
    }
    if (elemAttributes.size !== 0) {
        for (let [key, value] of elemAttributes) {
            newElement.setAttribute(key, value);
        }
    }
    return newElement;
}

/**
 * Renders the sort-by options on the left sidebar
 * @param {*} sortByDiv: the Bootstrap column for the sort-by options 
 */
function renderSortByOptions(sortByDiv) {
    let sortByHeader = createNewElement("h6");
    sortByHeader.innerText = "Sort By";
    sortByDiv.appendChild(sortByHeader);

    let sortOptions = new Map();
    sortOptions.set("Best Match", "best_match");
    sortOptions.set("Highest Rating", "rating");
    sortOptions.set("Most Reviewed", "review_count");
    
    let counter = 1;
    for (let [key, value] of sortOptions) {
        let inputDiv = createNewElement("div", ["form-check"]);

        let inputAttributes = new Map();
        inputAttributes.set("type", "radio");
        inputAttributes.set("name", "sortByOption");
        inputAttributes.set("id", "sortByOption" + counter);
        inputAttributes.set("value", value);
        let inputElem = createNewElement("input", ["form-check-input"], inputAttributes);
        inputDiv.appendChild(inputElem);

        labelAttributes = new Map();
        labelAttributes.set("for", "sortByOption" + counter);
        let inputLabel = createNewElement("label", ["form-check-label"], labelAttributes);
        inputLabel.innerText = key;
        inputDiv.appendChild(inputLabel);

        sortByDiv.appendChild(inputDiv);

        counter++;
    }

}