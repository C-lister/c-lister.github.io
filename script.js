document.addEventListener('DOMContentLoaded', function() {
    // Load profile information
    loadProfileInfo();
    loadGitHubStars();

    // Make all links open in a new tab
    makeAllLinksOpenInNewTab();

    // Set up MutationObserver to watch for dynamically added links
    setupLinkObserver();

    // Publication filters - including "First Author" for publications where user is first author or has equal contribution
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // Load publications data from JSON file
    loadPublications();
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            
            // Apply the selected filter.
            filterPublications();
        });
    });
    
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Only apply smooth scrolling to hash links (internal page links)
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    window.scrollTo({
                        top: targetSection.offsetTop - 100,
                        behavior: 'smooth'
                    });
                    
                    // Update active class
                    navLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                }
            }
        });
    });
    
    // Update active nav link on scroll
    window.addEventListener('scroll', function() {
        let current = '';
        const sections = document.querySelectorAll('section');
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === current) {
                link.classList.add('active');
            }
        });
    });
});

// Fetch current star counts on each visit; links remain useful if GitHub is unavailable.
function loadGitHubStars() {
    document.querySelectorAll('[data-github-repo]').forEach(async link => {
        const label = link.querySelector('.star-count');
        if (!label) return;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const response = await fetch(`https://api.github.com/repos/${link.dataset.githubRepo}`, {
                headers: { Accept: 'application/vnd.github+json' },
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`GitHub returned ${response.status}`);

            const data = await response.json();
            const count = data.stargazers_count;
            if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid star count');

            label.textContent = `${count.toLocaleString('en-US')} ${count === 1 ? 'star' : 'stars'}`;
        } catch {
            // Avoid showing outdated counts when offline or rate limited.
            label.textContent = 'Stars on GitHub';
        } finally {
            clearTimeout(timeout);
        }
    });
}

// Function to load profile information
function loadProfileInfo() {
    let profileJsonPath = 'data/profile-info.json';
    let isSubpage = window.location.pathname.includes('/pages/');
    if (isSubpage) {
        profileJsonPath = '../data/profile-info.json';
    }

    // Get profile-info container
    const profileInfoContainer = document.querySelector('.profile-info');
    if (!profileInfoContainer) return;

    fetch(profileJsonPath)
        .then(response => response.json())
        .then(data => {
            // Clear existing content
            profileInfoContainer.innerHTML = '';
            
            // Add name
            const nameElement = document.createElement('h1');
            nameElement.textContent = data.name;
            profileInfoContainer.appendChild(nameElement);
            
            // Add subtitle
            const subtitleElement = document.createElement('p');
            subtitleElement.className = 'subtitle';
            subtitleElement.innerHTML = data.subtitle;
            profileInfoContainer.appendChild(subtitleElement);
            
            // Add social links container
            const contactInfo = document.createElement('div');
            contactInfo.className = 'contact-info';
            
            // Add each social link
            data.socialLinks.forEach(link => {
                const linkContainer = document.createElement('p');
                const anchor = document.createElement('a');
                // Adjust URL paths for subpages
                if (isSubpage && link.url.startsWith('assets/')) {
                    anchor.href = '../' + link.url;
                } else {
                    anchor.href = link.url;
                }
                
                // Set target attribute - either from JSON or default to "_blank" for external links
                if (link.target) {
                    anchor.target = link.target;
                } else if (link.url && !link.url.startsWith('#')) {
                    anchor.target = '_blank';
                }
                
                // Fix SVG icon paths for subpages
                let iconHtml = link.icon;
                if (isSubpage && link.type === 'dblp') {
                    iconHtml = iconHtml.replace('src="assets/', 'src="../assets/');
                }
                
                anchor.innerHTML = iconHtml;
                linkContainer.appendChild(anchor);
                contactInfo.appendChild(linkContainer);
            });
            
            profileInfoContainer.appendChild(contactInfo);
            
            // Update profile image if there's a profile-image container
            const profileImageContainer = document.querySelector('.profile-image img');
            if (profileImageContainer && data.profileImage) {
                profileImageContainer.src = isSubpage ? 
                    '../' + data.profileImage : data.profileImage;
                profileImageContainer.alt = data.name;
            }
        })
        .catch(error => {
            console.error('Error loading profile information:', error);
        });
}

function filterPublications() {
    const activeFilter = document.querySelector('.filter-btn.active');
    const filterValue = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
    document.querySelectorAll('.publication').forEach(pub => {
        pub.style.display = filterValue === 'all' || pub.classList.contains(filterValue) ? 'flex' : 'none';
    });
}

// Function to load publications from JSON
function loadPublications() {
    let publicationsJsonPath = 'data/publications.json';
    if (window.location.pathname.includes('/pages/')) {
        publicationsJsonPath = '../data/publications.json';
    }

    const publicationsList = document.querySelector('.publications-list');
    if (!publicationsList) return;
    
    // Clear existing publications
    publicationsList.innerHTML = '';
    
    fetch(publicationsJsonPath)
        .then(response => response.json())
        .then(publications => {
            publications.forEach(pub => {
                const pubElement = document.createElement('div');
                const classes = ['publication', pub.type];
                if (pub.isFirstAuthor) classes.push('first-author');
                pubElement.className = classes.join(' ');
                
                // Create publication number
                const numberElement = document.createElement('span');
                numberElement.className = 'pub-number';
                numberElement.textContent = pub.number;
                
                // Create publication content container
                const contentElement = document.createElement('div');
                contentElement.className = 'pub-content';
                
                // Add title
                const titleElement = document.createElement('h3');
                titleElement.textContent = pub.title;
                contentElement.appendChild(titleElement);
                
                // Add authors
                const authorsElement = document.createElement('p');
                authorsElement.className = 'authors';
                authorsElement.innerHTML = pub.authors;
                contentElement.appendChild(authorsElement);
                
                // Add venue if it exists
                if (pub.venue) {
                    const venueElement = document.createElement('p');
                    venueElement.className = 'venue';
                    venueElement.textContent = pub.venue;
                    contentElement.appendChild(venueElement);
                }
                
                // Add tags
                const tagsContainer = document.createElement('div');
                tagsContainer.className = 'pub-tags';
                
                pub.tags.forEach(tag => {
                    if (tag.link) {
                        const tagLink = document.createElement('a');
                        tagLink.href = tag.link;
                        tagLink.className = `tag ${tag.class}`;
                        tagLink.textContent = tag.text;
                        // Add target="_blank" for links
                        if (!tag.link.startsWith('#')) {
                            tagLink.setAttribute('target', '_blank');
                        }
                        tagsContainer.appendChild(tagLink);
                    } else {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = `tag ${tag.class}`;
                        tagSpan.textContent = tag.text;
                        tagsContainer.appendChild(tagSpan);
                    }
                });
                
                contentElement.appendChild(tagsContainer);
                
                // Combine elements and add to publications list
                pubElement.appendChild(numberElement);
                pubElement.appendChild(contentElement);
                publicationsList.appendChild(pubElement);
            });
            filterPublications();
        })
        .catch(error => {
            console.error('Error loading publications data:', error);
        });
}

// Function to make all links open in a new tab
function makeAllLinksOpenInNewTab() {
    // Get all links in the document
    const links = document.querySelectorAll('a');
    
    // Loop through each link
    links.forEach(link => {
        const href = link.getAttribute('href');
        // Skip navigation links (links that start with #) and links without href
        if (href && !href.startsWith('#')) {
            // Set target to _blank to open in a new tab
            link.setAttribute('target', '_blank');
        }
    });
}

// Function to set up a MutationObserver to watch for new links
function setupLinkObserver() {
    // Select the target node (in this case, the entire document body)
    const targetNode = document.body;
    
    // Options for the observer (which mutations to observe)
    const config = { 
        childList: true, // observe direct children
        subtree: true, // and lower descendants too
        characterData: false, // don't care about text changes
        attributes: false // don't care about attribute changes
    };
    
    // Callback function to execute when mutations are observed
    const callback = function(mutationsList, observer) {
        // Check if any new nodes were added
        let newLinksAdded = false;
        
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any of the added nodes are links or contain links
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        if (node.tagName === 'A') {
                            newLinksAdded = true;
                            break;
                        } else if (node.querySelectorAll) {
                            const links = node.querySelectorAll('a');
                            if (links.length > 0) {
                                newLinksAdded = true;
                                break;
                            }
                        }
                    }
                }
            }
            
            if (newLinksAdded) break;
        }
        
        // If new links were added, update them to open in new tabs
        if (newLinksAdded) {
            makeAllLinksOpenInNewTab();
        }
    };
    
    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);
    
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
}
