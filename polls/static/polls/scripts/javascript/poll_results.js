/* Set up variables needed for AJAX */
let csrfToken = Cookies.get('csrftoken');

/* Add an event handler to the "Invite Friends" button so that the poll id is displayed */
document.getElementById("invite-btn").addEventListener("click", () => {
    let idDisplayRow = document.getElementById("poll-id-display-row");
    idDisplayRow.classList.toggle("id-display-hidden");
    idDisplayRow.classList.toggle("id-display-shown");

    let inviteBtn = document.getElementById("invite-btn");
    inviteBtn.classList.toggle("btn-primary");
    inviteBtn.classList.toggle("btn-danger");
    let venueListings = document.getElementById("venues-list");
    if (inviteBtn.classList.contains("btn-danger")) {
        inviteBtn.innerText = "Hide";
        venueListings.style.height = "57vh"
    } else {
        inviteBtn.innerText = "Invite Friends";
        venueListings.style.height = "66vh";
    }
});

let voterLinks = document.getElementsByClassName("voters-link");
for (let voterLink of voterLinks) {
    voterLink.addEventListener("click", function() {
        let httpRequest = new XMLHttpRequest();
        let choiceID = parseInt(voterLink.id.substring(12, ));
        httpRequest.onreadystatechange = function() {
            if (httpRequest.readyState === XMLHttpRequest.DONE) {
                if (httpRequest.status === 200) {
                    /* Populate the modal based on the response we get from the server */
                    let responseData = JSON.parse(httpRequest.responseText);
                    let votersList = responseData['voters_list'];
                    let votersListElement = document.getElementById("voters-list");
                    /* Clear previous results */
                    votersListElement.innerHTML = "";
                    for (let voter of votersList) {
                        let voterLi = document.createElement("li");
                        voterLi.innerText = voter;
                        votersListElement.appendChild(voterLi);
                    }
                    /* Clear the previous venue name */
                    document.getElementById("votes-list-modal-title").innerText = "";
                    document.getElementById("votes-list-modal-title").innerText = "Votes for " + responseData['venue_name'];
                    $('#votes-list-modal').modal('show');
                }
                else {
                    alert("There was a problem with the request");
                }
            }
        };
        httpRequest.open('POST', '/get_voters', true);
        httpRequest.setRequestHeader('Content-Type', 'application/json');
        httpRequest.setRequestHeader("X-CSRFToken", csrfToken);
        httpRequest.send(JSON.stringify(choiceID));
    });
}

document.getElementById("modal-close-btn").addEventListener("click", function() {
    $('#votes-list-modal').modal('toggle');
});