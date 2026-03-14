export async function publishSnapchat(content,media,connection){

if(!media.length){
return{
success:false,
error:"Snapchat requer mídia"
}
}

const res=await fetch(
"https://adsapi.snapchat.com/v1/media",
{
method:"POST",
headers:{
Authorization:`Bearer ${connection.access_token}`,
"Content-Type":"application/json"
},
body:JSON.stringify({
caption:content,
media_url:media[0]
})
}
)

const data=await res.json()

return{
success:true,
postId:data.media_id
}

}