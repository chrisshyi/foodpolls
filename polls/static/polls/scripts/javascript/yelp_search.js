/**
 * This .js file contains code pertaining to the main search page in the application. 
 * Functionality such as making an AJAX request to the server to obtain Yelp search results, rendering filter and 
 * sort options, and so on.
 */

let searchTerm = document.getElementById("search-term");
let city = document.getElementById("search-city");
let csrfToken = Cookies.get('csrftoken');
let httpRequest;
let response;
/*
 * Used to keep track of venues to be added to the poll,
 * maps venue yelp id -> venue information object
 *
 * example:
 * key    "E8RJkjfdcwgtyoPMjQ_Olg"
 * value
 * {
 *   "name": "Sunset Grill",
 *   "category": "Breakfast",
 *   "image_url": "some_url",
 *   "price_range": "4",
 *   "avg_rating": 5,
 *   "yelp_page_url": "some_url",
 * }
 *
 */
let venuesToAdd = new Map();
/**
 * Maps the display name of a category (string) to its alias (string, used for Yelp API calls)
 */
let categoryMap = new Map();
let selectedCategories = new Map();

/* Add click event listener for the search button */
document.getElementById("search-btn").addEventListener("click", function() {
    if (searchTerm.value !== "" && city.value !== "") {
        document.querySelector(".fa-spinner").style.display = "block";
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
 * Adds an event listener to the create poll button that fires off an AJAX
 * request to create the poll, with venue information in its payload
 *
 * Bind once the window has finished loading
 */
window.addEventListener("load", function() {
    document.getElementById("create-poll-btn").addEventListener("click", function() {
        let venuesList = Array.from(venuesToAdd.values());
        let createPollRequest = new XMLHttpRequest();
        createPollRequest.open('POST', '/generate_poll', true);
        createPollRequest.setRequestHeader('Content-Type', 'application/json');
        createPollRequest.setRequestHeader("X-CSRFToken", csrfToken);
        createPollRequest.send(JSON.stringify(venuesList));
    });
});


/* 
 * Adds a click event listener to the filter/sort toggle button so that it toggles a pop-up menu
 * when clicked
 */
window.addEventListener("load", function() {
    document.getElementById("toggle-filter-sort-btn").addEventListener("click", function() {
        if (categoryMap.size !== 0) {
            let slideUpDiv = document.getElementById("slide-up-div");
            slideUpDiv.classList.toggle("slide-up-hidden");
            slideUpDiv.classList.toggle("slide-up-shown");
            let overlay = document.getElementById("overlay");
            overlay.classList.toggle("overlay-hidden");
            overlay.classList.toggle("overlay-shown");
        }
    });
});


/*
 * Adds a click event listener to the "Refine" button in the filter and sort pop-up. Sends an AJAX
 * request to the server for filtered and/or sorted results
 */
document.getElementById("refine-btn").addEventListener("click", function() {
    /* Retract the filter/sort pop-up and the grey overlay */
    let slideUpDiv = document.getElementById("slide-up-div");
    slideUpDiv.classList.toggle("slide-up-hidden");
    slideUpDiv.classList.toggle("slide-up-shown");
    let overlay = document.getElementById("overlay");
    overlay.classList.toggle("overlay-hidden");
    overlay.classList.toggle("overlay-shown");

    // gather filter and sort information
    let categoryFilters = getFilterOptions("category-checkbox");
    let priceFilters = getFilterOptions("price-checkbox");
    let sortBy = getSortByOptions();

    makeSearchRequest(searchTerm.value, city.value, categoryFilters, priceFilters, sortBy);
});

/**
 * Add event listener to the "Cancel" button in the filter and sort menu so that
 * users can retract it
 */
document.getElementById("filter-cancel-btn").addEventListener("click", function() {
    let slideUpDiv = document.getElementById("slide-up-div");
    slideUpDiv.classList.toggle("slide-up-hidden");
    slideUpDiv.classList.toggle("slide-up-shown");
    let overlay = document.getElementById("overlay");
    overlay.classList.toggle("overlay-hidden");
    overlay.classList.toggle("overlay-shown");
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
            for (let i = 0; i < response['venues_list'].length; i++) {
                let business = response['venues_list'][i];
                businessListings.appendChild(createNewListing(business, i));
            }
            renderFilterAndSortOptions();
            document.querySelector(".fa-spinner").style.display = "none";
        }
        else {
            alert('There was a problem with the request.');
        }
    }
}

/**
 * Returns a new li element with the business's information rendered
 * @param business: a JavaScript object from the businesses array returned by the Yelp API
 * @param index: the array index of the business in the businesses array, used to retrieve information
 * about the business later when adding businesses to poll
 * @return a new <li> element with Yelp data about the business of interest
 */
function createNewListing(business, index) {
    for (let i = 0; i < business['categories'].length; i++) {
        let category = business['categories'][i];
        categoryMap.set(category['title'], category['alias']);
    }
    /* innerHttpRequest object will be used for an AJAX call to get reviews for a listing */
    let innerHttpRequest;
    /* The list item */
    let newLi = document.createElement("li");
    newLi.classList.add("media", "business-listing");
    /* The image of the restaurant */
    let liImage = document.createElement("img");
    liImage.setAttribute("width", "1000");
    liImage.setAttribute("height", "1000");
    liImage.setAttribute("src", business['img_url']);
    liImage.setAttribute("alt", "Image Not Found");
    liImage.classList.add("mr-3", "business-image");
    newLi.appendChild(liImage);
    /* The body of the media listing (Bootstrap) */
    let liBody = document.createElement("div");
    liBody.classList.add("media-body");
    newLi.appendChild(liBody);

    /* The header (restaurant name) */
    let mediaHeader = document.createElement("h5");
    mediaHeader.classList.add("mt-0");
    mediaHeader.classList.add("mb-1");
    mediaHeader.classList.add("listing-name-header");
    /* The category for the venue */
    let subHeader = document.createElement("h6");
    subHeader.classList.add("mt-0");
    subHeader.classList.add("mb-1");
    subHeader.innerText = business['categories'][0]['title'];
    subHeader.innerText += " " + business['price'];
    subHeader.classList.add("venue-category");

    let nameLink = document.createElement("a");
    nameLink.textContent = business['name'];
    nameLink.setAttribute("href", business['yelp_url']);
    nameLink.setAttribute("target", "_blank");
    mediaHeader.appendChild(nameLink);
    liBody.appendChild(mediaHeader);
    liBody.appendChild(subHeader);

    /* div containing the rating and price */
    let ratingAndLogo = document.createElement("div");
    ratingAndLogo.classList.add("rating-and-logo");
    let innerSpan = document.createElement("span");
    ratingAndLogo.appendChild(innerSpan);


    let yelpStarsImg = document.createElement("img");
    let imgUrl = "";
    imgUrl += "/static/polls/img/yelp/yelp_stars/small/small_";

    yelpStarsImg.setAttribute("class", "yelp-stars");
    ratingAndLogo.appendChild(yelpStarsImg);

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
    yelpPageLink.setAttribute("href", business['yelp_url']);
    yelpPageLink.setAttribute("target", "_blank");
    yelpPageLink.classList.add("yelp-page-link");
    let yelpLogo = document.createElement("img");
    yelpLogo.classList.add("yelp-logo");
    yelpLogo.setAttribute("src", "/static/polls/img/yelp/Yelp_trademark_RGB.png");
    yelpPageLink.appendChild(yelpLogo);
    ratingAndLogo.appendChild(yelpPageLink);

    let countAndAddSpan = document.createElement("span");
    countAndAddSpan.classList.add("add-btn-span");

    let reviewCount = document.createElement("p");
    reviewCount.classList.add("review-count");
    reviewCount.innerText = "Based on " + business['review_count'] + " reviews";

    let addBtn = document.createElement("button");
    addBtn.classList.add("btn", "btn-success", "btn-sm", "add-btn");
    addBtn.setAttribute("id", "add-btn-" + index);

    let businessId = business['yelp_id'];
    addBtn.innerText = "Add to Poll!";
    // set up listener for keeping track of venues to add when creating poll
    addBtn.addEventListener("click", function() {
        addBtn.classList.toggle("btn-danger");
        addBtn.classList.toggle("btn-success");
        /* Set.delete(element) returns true if the element exists */
        if (venuesToAdd.has(businessId)) {
            venuesToAdd.delete(businessId);
            addBtn.innerText = "Add to Poll!";
        } else {
            let venueInfoObj = {
                "name": business['name'],
                "category": business['categories'][0]['title'],
                "img_url": business['img_url'],
                "rating": business['rating'],
                "yelp_url": business['yelp_url'],
            };
            if (business.hasOwnProperty('price')) {
                venueInfoObj['price'] = business['price'];
            }
            venuesToAdd.set(businessId, venueInfoObj);
            addBtn.innerText = "Remove";
        }
    });
    countAndAddSpan.appendChild(addBtn);
    countAndAddSpan.appendChild(reviewCount);

    ratingAndLogo.appendChild(countAndAddSpan);

    liBody.appendChild(ratingAndLogo);
    let reviews = document.createElement("ul");
    reviews.setAttribute("id", "reviews_list");
    reviews.classList.add("list-unstyled");

    for (let i = 0; i < business['reviews'].length; i++) {
        let review = business['reviews'][i];
        let reviewEntry = document.createElement("li");
        reviewEntry.classList.add("media", "review-li");


        let reviewerImage = document.createElement("img");
        reviewerImage.classList.add("mr-3", "reviewer-img");
        let srcUrlList = review['user']['image_url'];
        reviewerImage.setAttribute("src", srcUrlList);
        reviewerImage.setAttribute("width", "400");
        reviewerImage.setAttribute("height", "400");
        reviewerImage.setAttribute("onerror", "this.src=\'/static/polls/img/assets/person_icon.png\'");
        reviewEntry.appendChild(reviewerImage);

        let reviewEntryBody = document.createElement("div");
        reviewEntryBody.classList.add("media-body", "review-body");
        reviewEntry.appendChild(reviewEntryBody);

        // let reviewText = document.createElement("p");
        let reviewLink = document.createElement("a");
        reviewLink.classList.add("review-link");
        reviewLink.setAttribute("target", "_blank");
        reviewLink.innerText = "Read More";
        reviewLink.setAttribute("href", review['url']);

        reviewEntryBody.innerText = review['text'];
        reviewEntryBody.appendChild(reviewLink);
        reviews.appendChild(reviewEntry);
    }
    liBody.appendChild(reviews);
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
    // document.getElementById("filter-header").innerText = "Filters";
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
        inputElem.value = (i + 1).toString();
        inputElem.classList.add("price-checkbox");
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
        /* If there are less than 4 categories, break before rendering undefined entries */
        if (i > categoryMap.size - 1) {
            break;
        }
        /* If more than 4 categories exist, render a link */
        if (i === 3 && categoryMap.size > 4) {
            let moreLink = document.createElement("a");
            moreLink.classList.add("more-link");
            moreLink.setAttribute("href", "javascript:;");
            moreLink.innerText = "More Categories";
            moreLink.addEventListener("click", function() {
                renderCategoryPopup();
                $('#category-modal').modal('toggle');
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
        inputElem.classList.add("category-checkbox");
        
        let selectedVal;
        let randomCategory;
        /* If some categories have been selected, render those first */
        if (typeof(selectedKeysIter) !== "undefined") {
            let nextItem = selectedKeysIter.next();
            if (!nextItem.done) {
                selectedVal = nextItem.value;
            }
        }

        if (typeof(selectedVal) !== "undefined") {
            inputElem.value = categoryMap.get(selectedVal);
            inputElem.checked = true;
        } else {
            /* Get a random category */
            do {
                randomCategory = categoryKeyIter.next().value;
            } while (renderedCategories.has(randomCategory));
            inputElem.value = categoryMap.get(randomCategory);
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
 * @returns a newly created DOM element
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
        let inputElem = createNewElement("input", ["form-check-input", "sort-by-radio"], inputAttributes);
        inputDiv.appendChild(inputElem);

        let labelAttributes = new Map();
        labelAttributes.set("for", "sortByOption" + counter);
        let inputLabel = createNewElement("label", ["form-check-label"], labelAttributes);
        inputLabel.innerText = key;
        inputDiv.appendChild(inputLabel);

        sortByDiv.appendChild(inputDiv);

        counter++;
    }

}

/**
 * Finds all checkboxes of a certain kind (e.g. price or category), and converts the checked ones into a string
 * for filtering use
 * @param {*} checkBoxClass the class of checkboxes to collect user input from
 * @returns a string representing checked options
 */
function getFilterOptions(checkBoxClass) {
    let checkBoxes = document.getElementsByClassName(checkBoxClass);
    let filters = "";

    for (let checkBox of checkBoxes) {
        if (checkBox.checked) {
            filters += (checkBox.value + ", ");
        }
    }
    filters = filters.replace(/, $/g, "");
    return filters;
}

/**
 * Finds the user selected sort option and returns its representative string
 * @returns a string representing the user selected sort-by option
 */
function getSortByOptions() {
    let sortByRadios = document.getElementsByClassName("sort-by-radio");
    let sortByOption = "";

    for (let sortByRadio of sortByRadios) {
        if (sortByRadio.checked) {
            sortByOption += sortByRadio.value;
        }
    }
    return sortByOption;
}