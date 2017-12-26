let search_term = document.getElementById("search-term");
let city = document.getElementById("search-city");
let csrf_token = Cookies.get('csrftoken');
let httpRequest;
let response;

document.getElementById("search-btn").addEventListener("click", function() {
    let search_data = {
        "search_term": search_term.value,
        "city": city.value,
    };
    /*
    ** Clear the business listings in a search had been done previously
     */
    let business_listings = document.getElementById("business_listings");
    business_listings.innerHTML = "";
    httpRequest = new XMLHttpRequest();
    httpRequest.open('POST', '/search_for_venues', true);
    httpRequest.onreadystatechange = populate_with_response;
    httpRequest.setRequestHeader('Content-Type', 'application/json');
    httpRequest.setRequestHeader("X-CSRFToken", csrf_token);
    httpRequest.send(JSON.stringify(search_data));
});


function populate_with_response() {
    let business_listings = document.getElementById("business_listings");
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 200) {
            response = JSON.parse(httpRequest.responseText);
            for (let i = 0; i < response['businesses'].length; i++) {
                let business = response['businesses'][i];
                business_listings.appendChild(create_new_listing(business));
            }
        }
        else {
            alert('There was a problem with the request.');
        }
    }
}

/* business is a JavaScript object from the object array returned by the Yelp API */
/* Returns a new li element with the business's information */
function create_new_listing(business) {
    let innerHttpRequest;
    /* The list item */
    let new_li = document.createElement("li");
    new_li.classList.add("media");
    /* The image of the restaurant */
    let li_image = document.createElement("img");
    li_image.setAttribute("src", business['image_url']);
    li_image.classList.add("mr-3");
    li_image.setAttribute("height", '200px');
    li_image.setAttribute("width", "200px")
    new_li.appendChild(li_image);
    /* The body of the media listing (Bootstrap) */
    let li_body = document.createElement("div");
    li_body.classList.add("media-body");
    new_li.appendChild(li_body);

    /* The header (restaurant name) */
    let media_header = document.createElement("h5");
    media_header.classList.add("mt-0");
    media_header.classList.add("mb-1");
    let sub_header = document.createElement("h6");
    sub_header.classList.add("mt-0");
    sub_header.classList.add("mb-1");
    sub_header.innerText = business['categories'][0]['title'];
    let name_link = document.createElement("a");
    name_link.textContent = business['name'];
    name_link.setAttribute("href", business['url']);
    media_header.appendChild(name_link);
    li_body.appendChild(media_header);
    li_body.appendChild(sub_header);

    /* div containing the rating and price */
    let rating_and_logo = document.createElement("div");
    let inner_span = document.createElement("span");
    rating_and_logo.appendChild(inner_span);
    let yelp_stars_img = document.createElement("img");
    let img_url = "";
    img_url += "/static/polls/img/yelp/yelp_stars/small/small_";

    yelp_stars_img.setAttribute("class", "yelp_stars");
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
    let yelp_logo = document.createElement("img");
    yelp_logo.setAttribute("src", "/static/polls/img/yelp/Yelp_trademark_RGB.png");
    yelp_logo.classList.add("yelp_logo");
    inner_span.appendChild(yelp_logo);
    li_body.appendChild(rating_and_logo);

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

    function append_reviews_to_li() {
        /**
         * Append the reviews to the list item representing the business listing
         */
        if (innerHttpRequest.readyState === XMLHttpRequest.DONE) {
            if (innerHttpRequest.status === 200) {
                let innerResponse = JSON.parse(innerHttpRequest.responseText);
                /* Create the reviews div */
                let reviews = document.createElement("div");
                reviews.setAttribute("id", "reviews_div");

                /* Create a header for the div */
                let reviews_header = document.createElement("p");
                reviews_header.innerText = "What reviewers say:";
                reviews.appendChild(reviews_header);

                for (let i = 0; i < 3; i++) {
                    let review = innerResponse['reviews'][i];
                    let review_entry = document.createElement("p");
                    let user_name = review['user']['name'];
                    let review_text = review['text'];

                    review_entry.innerText = `${user_name} : ${review_text}`;
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