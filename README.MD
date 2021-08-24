# Pareto Operating System (ParetOS)

The ParetOS is a browser-based, high level operating system designed to maximize human potential and performance. It is designed to give you the 20% of software you need to give you 80% of the benefits that technology can give you in optimizing your performance.

# Main Features

The Arena - a multiplayer, competitive habit tracking arena where you and your friends can see who has the best work ethic. Or who spends the most time playing videogames. Or who makes the most outbound sales call in your company. You can create your own template, and invite friends to play.

## We are live folks

See us at https://arena.pareto.education - the URL will change soon. Signup may or may not be working on day 1 (8.23.2021). I will be running some checks, writing some tickets in the next few days.

### Open-Source Development

Want to contribute? Great!

To fix a bug or contribute a new feature, follow these steps:

- Fork the repo
- Run `yarn` to install the dependencies, once you have `cd`'d into the directory
- Run `yarn start` to start the dev server
- Create a new branch (`git checkout -b improve-feature`)
- Make the appropriate changes in the files
- Add Git changes to reflect the changes made
- Commit your changes (`git commit -m 'Improve feature'`)
- Push to the branch
- Send a PR, and become a legend

### Bug / Feature Request

If you find a bug, have a great idea or just a question - please open an issue [here](https://github.com/mikhael28/paretOS/issues/new)!

## Built with

- [React + JavaScript](https://reactjs.org/) - The classics, the essentials..
- [Progressive Web Application](https://web.dev/progressive-web-apps/) - Better than investing time into a mobile application, I figure that having the offline functionality of a PWA will give us the right balance of features and accessibility. Right now, the PWA only installs on mobile - this is 100% intended to be used on phones, while on the links.
- [AWS Lambda](https://aws.amazon.com/lambda/) - We needed a service to store our Stellar and DynamoDB authentication/data storage, and wanted to avoid paying $10/mo for a container instance on a side-project that is only used by two people (as of 8.12.21, at least)
- MongoDB + other services.


## Team

[![Michael 'Misha' Litchev](https://avatars.githubusercontent.com/u/15205259?s=400&u=64ad9374b8d98f09dc5709fcc737e5ec4f2447f3&v=4)](https://github.com/mikhael28)

## [License](https://github.com/mikhael28/paretOS/blob/main/LICENSE)

GNU General Public License Version 2 Only © [Michael 'Misha' Litchev](https://github.com/mikhael28)