# CDK-Constructs Contributing Guide

## Foreword

Welcome to the AWS CDK Constructs repository! We are thrilled to have you as a contributor.

Before you start contributing, please read the following guidelines.

## Guidelines
 - Don't Fork the repository, create a branch from the `main` branch.
 - ***Branching Strategy*** - Create a new branch for each feature, bug fix, or enhancement you plan to work on. Use ticket keys to name your branches.
 - ***Coding*** -Follow strategies and patterns from the existing constructs. We use TypeScript for all our constructs, and we follow OO design patterns. To start, extend the [`ABConstruct`](src/common/ab.contruct.ts) class. Make public the abstract methods that you want to expose to the user.
 - ***Common package*** - holds the common code for all the constructs. It's a good place to put code that is shared between constructs. It's also a good place to put code that is not specific to a construct. For example, the configurations and constants that relate to our Environments. Be mindful that changes in the common package will affect all the constructs, this is infrastructure changes in simple names can have catastrophic effects.
 - ***Documentation*** - Document your code and provide examples of how to use your construct. Every package should have a README.md file that explains how to use the constructs in the package.
 - ***Code Style and Formatting*** - Consistent code style and formatting are crucial for maintainability. 
 - This is Infrastructure as Code, It will not run in production. It will be used to create the infrastructure in the cloud.
 - ***Testing*** - Include appropriate unit tests to ensure the correctness and reliability of your code. Test coverage is highly encouraged to provide comprehensive coverage of the construct's functionality. Use `Template` to create the infrastructure and `Snapshot` to test the infrastructure.
 - Quality checks are automated using GitHub Actions so your PR will be blocked from being merged if any of the required checks don't pass even though it's been approved by a maintainer.
 - ***Testing your changes*** - Once you have your changes completed you should test it. Testing a library requires that you test your changes in a scenario where your code can be used on a real-world case, so here are the steps for testing:
   - 1st step is to  create a ***ALPHA*** version:
     - Localy Check out the alpha branch -`git chechout alpha`;
     - Merge your changes into the alpha branch - `git merge <your branch name>`;
     - Handle any merge conflicts;
     - Push the changes to the remote repository - `git push`;
     - This will trigger the pipeline to publish a new alpha version of your changes to CodeArtifact.
   - You can then use this beta version in the projects you want to test your changes. The Pipeline will provide you with instructions on how to use the alpha version in your projects.
    
   See the [Manual Testing](#manual-testing) section below for more details. The changes must be tested in a project before they can be merged into the repository. It is part of the review process to paste a link to the PR in the relevant CDK project where the new construct or construct update is implemented.
  
   <img width="884" alt="image" src="https://github.com/ApplyBoard/cdk-constructs/assets/102676130/b42812ef-3a84-489e-9ec6-527d19b3a8e8">

   Next, you then click the build summary to see more instructions as to how you can use these in the projects you want to test your changes in:

   <img width="2073" alt="image" src="https://github.com/ApplyBoard/cdk-constructs/assets/102676130/034bfa37-5656-40c7-92fa-197f4d860060">

 - ***Pull Requests*** - When you are ready to submit your contribution, create a Pull Request (PR) from your branch to the main repository's main branch. Include a descriptive title and provide a clear description of the changes made in the PR. If your PR addresses an existing issue, reference it in the description. Additionally, include a link to the PR in the relevant CDK project where the new construct or construct update is implemented. No changes are accepted without a project where the changes are implemented and tested.
 - ***Releases*** - Releases, as of now, are not yet automated. Once your PR is _Approved_ and _Merged_, you can create a release by following the steps below:
    1. Create a new Release in your local branch by running `npm version <major|minor|patch>`. This will update the `package.json` file and create a new commit with the updated version.
    2. Make sure you update the `CHANGELOG.md` file with the changes you made in the new version and you obey the [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) format.
    3. Push the changes to the remote repository by running `git push --follow-tags`.
    4. Merge the changes to the main branch.
    5. Create a new release in GitHub by going to the [Releases](https://github.com/ApplyBoard/cdk-constructs/releases) page and clicking on the `Draft a new release` button. Use the version number as the tag and title of the release. Add a description of the changes made in the release. Click on the `Publish release` button to publish the release.
    6. The Pipeline will automatically publish the new version to CodeArtifact.


   <img width="884" alt="image" src="https://github.com/ApplyBoard/cdk-constructs/assets/102676130/b42812ef-3a84-489e-9ec6-527d19b3a8e8">

   Next, you then click the build summary in order to see more instructions as to how you can use these in the projects you want to tests your changes in:

   <img width="2073" alt="image" src="https://github.com/ApplyBoard/cdk-constructs/assets/102676130/034bfa37-5656-40c7-92fa-197f4d860060">


 - ***Review Process*** - Other contributors and maintainers will review your PR. Be responsive to feedback and make necessary changes promptly. Maintain a professional and respectful tone during discussions. Once the changes are approved, they will be merged into the repository.
 - ***Versioning*** - All changes must adhere to the principles of Semantic [Versioning 2.0.0](https://semver.org/). Increment the version number according to the guidelines when making changes that affect the Constructs or behavior of the construct. Breaking changes must be documented clearly and accompanied by examples of how to circumvent any issues caused by the changes. Update the CHANGELOG.md file with a summary of the changes made in each version following [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) format.
 - Your PR should pass the `Integration/build` check on GitHub. It prevents unformatted code, linting violations, and type errors from slipping through to main.
 - Remember, the maintainers and community are here to help you throughout the process. Feel free to ask questions, seek guidance, and collaborate with others.

Thank you for your contributions to the AWS CDK Constructs repository! Your efforts contribute to the growth and success of the AWS CDK community.
