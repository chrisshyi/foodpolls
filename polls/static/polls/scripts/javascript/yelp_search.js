let search_term = document.getElementById("search-term");
let city = document.getElementById("search-city");
let csrf_token = Cookies.get('csrftoken');
let httpRequest;
let response;
/**
 * Maps the display name of a category (string) to its alias (string, used for Yelp API calls)
 */
let category_map = new Map();
let selected_categories = new Map();

/* Add click event listener for the search button */
document.getElementById("search-btn").addEventListener("click", function() {
    if (search_term.value !== "" && city.value !== "") {
        category_map.clear();
        selected_categories.clear();
        make_search_request(search_term.value, city.value)
    }
});


/* Add click event listener for the select button in the categories pop-up window */
document.getElementById("select-category-btn").addEventListener("click", function() {
    let checkboxes = document.getElementsByClassName("pop-up-input");
    /* clear the selected_categories map */
    selected_categories.clear();
    for (let checkbox of checkboxes) {
        if (checkbox.checked === true) {
            selected_categories.set(checkbox.value, category_map.get(checkbox.value));
        }
    }   
    
    /* Refresh the categories display on the main page */
    let categories_div = document.getElementById("categories-div");
    /* Clear what was in the categories div before */
    categories_div.innerHTML = "";
    generate_category_filters(categories_div);
    

    $('#category-modal').modal('toggle');
});


/**
 * Make an AJAX request to the server for restaurant data based on search parameters
 * @param search_term: the search term (String)
 * @param city: the city to conduct the search in (String)
 * @param categories: categories to filter the results by (Array of Strings)
 * @param price: price levels  (Array of Strings)
 * @param sort_by: Either 'best_match', 'rating', or 'review_count' (string)
 */
function make_search_request(search_term, city, categories="", price="", sort_by="") {
    let search_params = ["search_term", "city", "categories", "price", "sort_by"];

    let search_data = {
        "search_term": search_term,
        "city": city,
        "categories": categories,
        "price": price,
        "sort_by": sort_by,
    };
    /* Remove optional parameters that are empty strings */
    search_params.forEach(function(param) {
        if (search_data[param] === "") {
            delete search_data[param];
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
    httpRequest.onreadystatechange = populate_with_response;
    httpRequest.setRequestHeader('Content-Type', 'application/json');
    httpRequest.setRequestHeader("X-CSRFToken", csrf_token);
    httpRequest.send(JSON.stringify(search_data));
}

/**
 * Populate the web page with search results returned by our server (data from Yelp)
 */
function populate_with_response() {
    let business_listings = document.getElementById("business_listings");
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 200) {
            response = JSON.parse(httpRequest.responseText);
            for (let i = 0; i < response['businesses'].length; i++) {
                let business = response['businesses'][i];
                business_listings.appendChild(create_new_listing(business));
            }
            render_filter_and_sort_options();
            
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
function create_new_listing(business) {
    for (let i = 0; i < business['categories'].length; i++) {
        let category = business['categories'][i];
        category_map.set(category['title'], category['alias']);
    }
    let innerHttpRequest;
    /* The list item */
    let new_li = document.createElement("li");
    new_li.classList.add("media", "business-listing");
    /* The image of the restaurant */
    let li_image = document.createElement("img");
    li_image.setAttribute("src", business['image_url']);
    li_image.classList.add("mr-3");
    li_image.setAttribute("height", '200px');
    li_image.setAttribute("width", "200px");
    new_li.appendChild(li_image);
    /* The body of the media listing (Bootstrap) */
    let li_body = document.createElement("div");
    li_body.classList.add("media-body");
    new_li.appendChild(li_body);

    /* The header (restaurant name) */
    let media_header = document.createElement("h5");
    media_header.classList.add("mt-0");
    media_header.classList.add("mb-1");
    /* The category for the venue */
    let sub_header = document.createElement("h6");
    sub_header.classList.add("mt-0");
    sub_header.classList.add("mb-1");
    sub_header.innerText = business['categories'][0]['title'];
    sub_header.classList.add("venue-category");

    let name_link = document.createElement("a");
    name_link.textContent = business['name'];
    name_link.setAttribute("href", business['url']);
    media_header.appendChild(name_link);
    li_body.appendChild(media_header);
    li_body.appendChild(sub_header);

    /* div containing the rating and price */
    let rating_and_logo = document.createElement("div");
    rating_and_logo.classList.add("rating-and-image");
    let inner_span = document.createElement("span");
    rating_and_logo.appendChild(inner_span);

    let review_count = document.createElement("p");
    review_count.classList.add("review-count");
    review_count.innerText = "Based on " + business['review_count'] + " reviews";
    rating_and_logo.appendChild(review_count);

    let yelp_stars_img = document.createElement("img");
    let img_url = "";
    img_url += "/static/polls/img/yelp/yelp_stars/small/small_";

    yelp_stars_img.setAttribute("class", "yelp-stars");
    inner_span.appendChild(yelp_stars_img);

    let rating = business['rating'];
    /* Check if the rating is an integer */
    let half = !Number.isInteger(rating);
    rating = Math.floor(rating);
    /*
    ** Generate the img url based on the rating
     */
    img_url += rating;
    if (half) {
        img_url += "_half"
    }
    img_url += "@2x.png";
    yelp_stars_img.setAttribute("src", img_url);


    /*
    ** Add the Yelp image logo
     */
    let yelp_page_link = document.createElement("a");  /* anchor that links to the listing's Yelp page */
    yelp_page_link.setAttribute("href", business['url']);
    let yelp_logo = document.createElement("img");
    yelp_logo.classList.add("yelp-logo");
    yelp_logo.setAttribute("src", "/static/polls/img/yelp/Yelp_trademark_RGB.png");
    yelp_page_link.appendChild(yelp_logo);
    inner_span.appendChild(yelp_page_link);
    /* TODO: Add a "Add to Poll" button for each listing */
    li_body.appendChild(rating_and_logo);

    /**
     * Gets some reviews for this listing via an AJAX call to the server
     */
    function get_review_request() {
        /**
         *  Get three reviews from Yelp using an AJAX call
         */
        let search_data = {
            "business_id": business['id'],
        };

        innerHttpRequest = new XMLHttpRequest();
        innerHttpRequest.open('POST', '/get_reviews', true);
        innerHttpRequest.onreadystatechange = append_reviews_to_li;
        innerHttpRequest.setRequestHeader('Content-Type', 'application/json');
        innerHttpRequest.setRequestHeader("X-CSRFToken", csrf_token);
        innerHttpRequest.send(JSON.stringify(search_data));
    }

    /**
     * Appends reviews to the list item for this listing
     */
    function append_reviews_to_li() {
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
                    let review_entry = document.createElement("li");
                    review_entry.classList.add("media", "review-li");


                    let reviewer_image = document.createElement("img");
                    reviewer_image.classList.add("mr-3", "reviewer-img");
                    let src_url_list = review['user']['image_url'];
                    reviewer_image.setAttribute("src", src_url_list);
                    reviewer_image.setAttribute("onerror", "this.src=\'/static/polls/img/assets/person_icon.png\'");
                    review_entry.appendChild(reviewer_image);

                    let review_entry_body = document.createElement("div");
                    review_entry_body.classList.add("media-body", "review-body");
                    review_entry.appendChild(review_entry_body);

                    // let review_text = document.createElement("p");
                    let review_link = document.createElement("a");
                    review_link.classList.add("review-link");
                    review_link.innerText = "Read More";
                    review_link.setAttribute("href", review['url']);

                    review_entry_body.innerText = review['text'];
                    review_entry_body.appendChild(review_link);
                    reviews.appendChild(review_entry);
                }
                li_body.appendChild(reviews);
            }
            else {
                alert('There was a problem with the request.');
            }
        }
    }

    get_review_request();

    return new_li;
}

/**
 * Renders a pop up window with category check boxes that the user can use to filter listings
 */
function render_category_popup() {
    let category_col_one = document.getElementById("category-col-one");
    let category_col_two = document.getElementById("category-col-two");

    /* wipe clean the previous records */
    category_col_one.innerHTML = "";
    category_col_two.innerHTML = "";

    let category_key_iter = category_map.keys();
    let mid_index = Math.floor(category_map.size / 2);
    let input_div;
    for (let i = 0; i < category_map.size; i++) {
        let category_key = category_key_iter.next().value;
        input_div = document.createElement("div");
        input_div.classList.add("form-check");

        let input_elem = document.createElement("input");
        input_elem.classList.add("form-check-input", "pop-up-input");
        input_elem.setAttribute("type", "checkbox");
        input_elem.setAttribute("value", category_key);
        input_elem.setAttribute("id", "pop-up-check" + i);
        input_elem.value = category_key;
        if (selected_categories.has(category_key)) {
            input_elem.checked = true;
        }
        input_div.appendChild(input_elem);

        let input_label = document.createElement("label");
        input_label.classList.add("form-check-label");
        input_label.setAttribute("for", "pop-up-check" + i);
        input_label.innerText = category_key;
        input_div.appendChild(input_label);

        if (i < mid_index) {
            category_col_one.appendChild(input_div);
        } else {
            category_col_two.appendChild(input_div);
        }
    }

}

/**
 * Renders the left side-panel displaying filter and sort options
 */
function render_filter_and_sort_options() {
    let price_div = document.getElementById("price-div");
    let categories_div = document.getElementById("categories-div");
    let sort_by_div = document.getElementById("sort-by");
    document.getElementById("filter-header").innerText = "Filters";
    generate_category_filters(categories_div);
    generate_price_filter(price_div);
    renderSortByOptions(sort_by_div);
}

/**
 * Render the price range filters on the page
 * @param price_div: the Bootstrap column for price filters
 */
function generate_price_filter(price_div) {
    let header = document.createElement("h6");
    header.innerText = "Price";
    price_div.appendChild(header);

    let price_form = document.createElement("form");
    let dollar_signs = "$";
    for (let i = 0; i < 4; i++) {
        let input_div = document.createElement("div");
        input_div.classList.add("form-check");

        let input_elem = document.createElement("input");
        input_elem.classList.add("form-check-input");
        input_elem.setAttribute("type", "checkbox");
        input_elem.id = "price-check-" + (i + 1);
        input_div.appendChild(input_elem);

        let input_label = document.createElement("label");
        input_label.classList.add("form-check-label");
        input_label.setAttribute("for", input_elem.id);
        input_label.innerText = dollar_signs;
        input_div.appendChild(input_label);

        price_form.appendChild(input_div);
        dollar_signs += "$";
    }
    price_div.appendChild(price_form);
}

/**
 * Render the category filter form on the page
 * @param category_div: the div element for the filter form
 */
function generate_category_filters(category_div) {
    let header = document.createElement("h6");
    header.innerText = "Categories";
    category_div.appendChild(header);

    let category_key_iter = category_map.keys();
    let category_form = document.createElement("form");
    category_div.appendChild(category_form);
    let selected_keys_iter;
    /* 
     * Keep track of what's already rendered to avoid duplicates when 
     * generating items randomly
     */
    let rendered_categories = new Set();
    if (selected_categories.size > 0) {
        selected_keys_iter = selected_categories.keys();
    }

    for (let i = 0; i < 4; i++) {
        /* If more than 4 categories exist, render a link */
        if (i === 3 && category_map.size > 4) {
            let more_link = document.createElement("a");
            more_link.classList.add("more-link");
            more_link.setAttribute("href", "javascript:;");
            more_link.innerText = "More Categories";
            more_link.addEventListener("click", function() {
                render_category_popup();
                $('#category-modal').modal('toggle')
            });
            category_div.appendChild(more_link);
            break;
        }
        let input_div = document.createElement("div");
        input_div.classList.add("form-check");

        let input_elem = document.createElement("input");
        input_elem.classList.add("form-check-input");
        input_elem.setAttribute("type", "checkbox");
        input_elem.id = "category-check-" + (i + 1);
        
        let selected_val;
        let random_category;
        if (typeof(selected_keys_iter) !== "undefined") {
            let next_item = selected_keys_iter.next();
            if (!next_item.done) {
                selected_val = next_item.value;
            }
        }

        if (typeof(selected_val) !== "undefined") {
            input_elem.value = selected_val;
            input_elem.checked = true;
        } else {
            do {
                random_category = category_key_iter.next().value;
            } while (rendered_categories.has(random_category));
            input_elem.value = random_category;
            input_elem.checked = false;
        }
        rendered_categories.add(input_elem.value);
        input_div.appendChild(input_elem);


        let input_label = document.createElement("label");
        input_label.classList.add("form-check-label");
        input_label.setAttribute("for", input_elem.id);
        // PyCharm warning here, ignore
        if (typeof(selected_val) !== "undefined") {
            input_label.innerText = selected_val;
        } else {
            input_label.innerText = random_category;
        }
        input_div.appendChild(input_label);

        category_form.appendChild(input_div);

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