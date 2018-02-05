/* Set up variable for AJAX calls */
let csrfToken = Cookies.get('csrftoken');
let httpRequest;

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

/* Set of choices (venues) that the users wishes to vote for */
let userVotedChoices = new Set();

/* Bind voting logic to each "Vote!" button */
let voteButtons = document.getElementsByClassName("vote-btn");
for (let voteButton of voteButtons) {
    voteButton.addEventListener("click", function() {
        let choiceID = parseInt(voteButton.id.substring(9, ));
        voteButton.classList.toggle("btn-danger");
        voteButton.classList.toggle("btn-success");
        if (userVotedChoices.has(choiceID)) {
            voteButton.innerText = "Vote!";
            userVotedChoices.delete(choiceID);
        } else {
            voteButton.innerText = "Undo";
            userVotedChoices.add(choiceID);
        }
    });
}

document.getElementById("confirm-voting-btn").addEventListener("click", function() {
    httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
            if (httpRequest.status === 200) {
                $('#votes-confirm-modal').modal('show');
            } else {
                alert("There was a problem with the request");
            }
        }
    };
    httpRequest.open('POST', '/confirm_votes', true);
    httpRequest.setRequestHeader('Content-Type', 'application/json');
    httpRequest.setRequestHeader("X-CSRFToken", csrfToken);
    httpRequest.send(JSON.stringify(Array.from(userVotedChoices)));
});