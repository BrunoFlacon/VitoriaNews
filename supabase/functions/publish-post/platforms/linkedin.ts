export async function publishLinkedin(content, media, connection){

const author=`urn:li:person:${connection.platform_user_id}`

const res=await fetch(
"https://api.linkedin.com/v2/ugcPosts",
{
method:"POST",
headers:{
Authorization:`Bearer ${connection.access_token}`,
"Content-Type":"application/json",
"X-Restli-Protocol-Version":"2.0.0"
},
body:JSON.stringify({
author:author,
lifecycleState:"PUBLISHED",
specificContent:{
"com.linkedin.ugc.ShareContent":{
shareCommentary:{
text:content
},
shareMediaCategory:"NONE"
}
},
visibility:{
"com.linkedin.ugc.MemberNetworkVisibility":"PUBLIC"
}
})
}
)

const data=await res.json()

if(data.message){

return{
success:false,
error:data.message
}

}

return{
success:true,
postId:data.id
}

}