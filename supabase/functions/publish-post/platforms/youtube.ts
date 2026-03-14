export async function publishYoutube(content: string,media: any,connection: { access_token: any }){

const res=await fetch(
"https://www.googleapis.com/youtube/v3/videos?part=snippet,status",
{
method:"POST",
headers:{
Authorization:`Bearer ${connection.access_token}`,
"Content-Type":"application/json"
},
body:JSON.stringify({
snippet:{
title:content.substring(0,100),
description:content
},
status:{
privacyStatus:"public"
}
})
}
)

const data=await res.json()

if(data.error){

return{
success:false,
error:data.error.message
}

}

return{
success:true,
postId:data.id
}

}