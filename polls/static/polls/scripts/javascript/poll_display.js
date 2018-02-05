/* Add an event handler to the "Invite Friends" button so that the poll id is displayed */
document.getElementById("invite-btn").addEventListener("click", function() {
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

let userVotedChoices = new Set();

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