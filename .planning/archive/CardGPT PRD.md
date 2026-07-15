# CardGPT PRD

Category: Lifestyle
Status: Exploring
Priority: High
Potential Impact: Small
Feasibility: Easy
Tags: Fun
Date Added: January 9, 2026
Next Review: January 16, 2026

Objective: 
To advise customers which credit card to maximize rewards

Customer Painpoints: 
In Hong Kong, credit card scheme rewards vary a lot and average user has > 3 credit cards to maximize rewards from their spending.  

Solution: 
To build a website where users can visit and ask what’s the best card(s) to use in specific scenarios.  We can start with solving this problem before expanding into monetization. 

Features: 
    Data Input:
    - Credit Card Rewards Data will have to be manually curated from the beginning. Explore Automation later.
    - Data sources can be: Finance blog or Aggregator sites such as Moneyhero, Moneysmart  
    - Following parameters/variables can determine the output recommendation
        - Reward % per $ spent
        - Transaction Fee to user
        - Merchant type
        - Payment type (Online / Offline)
        - Spending currency (HKD vs non-HKD)
        - Unit of rewards (E.g. Cash vs Asia Miles vs Bank-specific Points)
        - Rewards Cap (Maximum)
        - Day of week of transaction
    - Start with <100 cards 

    Recommendation Logic:
    - We need optimization logic based on the preferred categories they select
    - We can recommend multiple cards for one transaction, but it should only be for cases where maximum rewards cap has met and also if the merchant allows transaction splitting with different cards (e.g. wedding venue deposits) 
    - If there are ties, it should first be decided by users' preference indication. If there is no indication, we can first sort by categories - cash back reward should be considered highest priority, then it's mileage and then rest.  Within the same categories, sort by the estimated rewards. No conversion between different units are required for now (except rewards in different fiat currency (e,g, HKD vs JPY))
    - Assume users own all cards in the recommendation

    User Experience:
    - User do not have to login to use the tool and use it on a desktop website
    - User can select the preferred rewards categories tags before inputing 
    - User can select some popular merchant tags before inputing
    - a text field for user to input their upcoming spending transaction (analyzed via NLP)
    - Selected tags should be populated in the text field
    - Platform supports both Chinese and English for the prompt and have language switch
    - After analysis, users should see cards sorted in descending order (with the top option with a "Recommended" Tag), the estimated rewards from the transaction via that card, estimated fees for that transaction,  an CTA "Apply Here" redirecting to the issuer's website's card page
    - Tool is free for v1, will add monthly subscription + token limit model for future versions

    Design:
    - Light and Dark Mode
    - Website Colour tone: Reference Chatgpt.com
    - Let-to-right 'typing' Animation that activates every 1 minute and when user refresh above the text field { Eng: "How much are you earning from spending today?" | Chinese: 你今日想點賺法？}