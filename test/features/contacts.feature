Feature: Contacts
    As a user, I would like to be able to view,
    add, edit, and delete contacts.

Scenario: View a contact
    Given I am viewing the contacts list
    When I select the first contact in the list
    Then I should see a detailed view of that contact